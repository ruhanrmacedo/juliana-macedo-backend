import { AppDataSource } from "../config/ormconfig";
import { AnthropometryEvaluation } from "../models/anthropometry/AnthropometryEvaluation";
import { AnthropometryResult } from "../models/anthropometry/AnthropometryResult";
import { calcAutopick } from "../models/anthropometry/autopick";
import { AnthropometryCalculator } from "../models/anthropometry/calculators";
import { betweenDates, getAgeYearsAt } from "../models/anthropometry/calculators/utils/date";
import { BadRequest, Forbidden, normalizeNumber, requireFields } from "../models/anthropometry/calculators/utils/errors";
import { AnthropometryMethod } from "../models/enums/AnthropometryMethod";
import { UserMetricsService } from "./UserMetricsService";
import { NivelAtividade } from "../models/enums/NivelAtividade";

type CreateEvalInput = Partial<AnthropometryEvaluation> & {
    userId: number;
    measuredAt: string | Date;
};

const evalRepo = () => AppDataSource.getRepository(AnthropometryEvaluation);
const resRepo = () => AppDataSource.getRepository(AnthropometryResult);

async function syncMetricsFromEvaluation(
    evaluation: AnthropometryEvaluation,
    opts?: { gorduraCorporal?: number }
) {
    try {
        const userId = evaluation.userId;
        // pega último nível de atividade (fallback)
        const last = await UserMetricsService.getUserMetrics(userId);
        const lastNivel = last[0]?.nivelAtividade ?? NivelAtividade.SEDENTARIO;

        await UserMetricsService.createUserMetrics(
            userId,
            evaluation.peso,            // pode vir undefined -> serviço usa fallback
            evaluation.altura,
            evaluation.idade,
            evaluation.sexo,
            lastNivel,
            opts?.gorduraCorporal      // define/atualiza gordura corporal quando disponível
        );
    } catch (e) {
        // não quebrar o fluxo da antropometria se métrica falhar
        console.warn("[anthropometry→metrics] sync falhou:", (e as Error).message);
    }
}

export const AnthropometryService = {

    async createEvaluation(input: CreateEvalInput) {
        requireFields(input, ["userId", "measuredAt"]);

        // Normalização de numéricos (vírgula/ponto)
        const numericKeys: (keyof AnthropometryEvaluation)[] = [
            "peso", "altura", "cintura_cm", "quadril_cm", "pescoco_cm", "braco_muac_cm",
            "coxa_circ_cm", "panturrilha_circ_cm",
            "triceps_mm", "biceps_mm", "subescapular_mm", "supra_iliaca_mm", "abdominal_mm",
            "peitoral_torax_mm", "axilar_media_mm", "coxa_mm", "panturrilha_medial_mm"
        ];

        for (const k of numericKeys) {
            const v = (input as any)[k];
            if (v !== undefined && v !== null) (input as any)[k] = normalizeNumber(v);
        }

        const entity = evalRepo().create({
            ...input,
            measuredAt: new Date(input.measuredAt),
        });

        const saved = await evalRepo().save(entity);

        if (saved.peso != null || saved.altura != null || saved.idade != null || saved.sexo) {
            await syncMetricsFromEvaluation(saved);
        }
        return saved;
    },

    async updateEvaluation(id: number, payload: Partial<AnthropometryEvaluation>, requester: { id: number; role: string }) {
        const evaluation = await evalRepo().findOne({ where: { id }, relations: ["user", "assessor"] });
        if (!evaluation) throw new BadRequest("Avaliação não encontrada");

        // Permissões: admin pode tudo; usuário só a própria
        if (requester.role !== "admin" && requester.id !== evaluation.userId) {
            throw new Forbidden("Acesso negado");
        }

        // Normalização
        Object.keys(payload).forEach((k) => {
            const val = (payload as any)[k];
            if (typeof val === "string" && /^-?\d+[.,]?\d*$/.test(val)) {
                (payload as any)[k] = normalizeNumber(val);
            }
        });

        evalRepo().merge(evaluation, payload);

        const updated = await evalRepo().save(evaluation);

        if (
            payload.peso != null || payload.altura != null ||
            payload.idade != null || payload.sexo != null
        ) {
            await syncMetricsFromEvaluation(updated);
        }
        return updated;
    },

    async computeWithAutopick(evaluationId: number, requester: { id: number; role: string }) {
        const evaluation = await evalRepo().findOne({ where: { id: evaluationId }, relations: ["user"] });
        if (!evaluation) throw new BadRequest("Avaliação não encontrada");
        if (requester.role !== "admin" && requester.id !== evaluation.userId) {
            throw new Forbidden("Acesso negado");
        }
        if (!evaluation.sexo) throw new BadRequest("Campo 'sexo' é obrigatório para o cálculo.");
        if (evaluation.idade == null) {
            const age = getAgeYearsAt(evaluation.user?.dataNascimento, evaluation.measuredAt);
            evaluation.idade = age ?? 0;
        }

        const pick = calcAutopick(evaluation);
        if (pick.nextModule) {
            // Gestante/obesidade severa/etc.
            return { nextModule: pick.nextModule };
        }

        // Perfil pediátrico: WHO sempre; Slaughter opcional
        const results: AnthropometryResult[] = [];
        if (pick.who) {
            for (const m of pick.who) {
                const r = await AnthropometryCalculator.runAndPersist(m, evaluation);
                results.push(r);
            }
            if (pick.slaughter) {
                const r = await AnthropometryCalculator.runAndPersist(AnthropometryMethod.SLAUGHTER, evaluation);
                results.push(r);
            }

            const pg = results.find(r => r.percentualGordura != null)?.percentualGordura;
            if (pg != null) await syncMetricsFromEvaluation(evaluation, { gorduraCorporal: Number(pg) });

            return results;
        }

        // Adulto/idoso
        if (pick.method) {
            const r = await AnthropometryCalculator.runAndPersist(pick.method, evaluation);

            if (r?.percentualGordura != null) {
                await syncMetricsFromEvaluation(evaluation, { gorduraCorporal: Number(r.percentualGordura) });
            }
            return [r];
        }

        throw new BadRequest("Não foi possível determinar o método");
    },

    async computeWithMethod(evaluationId: number, method: AnthropometryMethod, requester: { id: number; role: string }) {
        const evaluation = await evalRepo().findOne({ where: { id: evaluationId }, relations: ["user"] });
        if (!evaluation) throw new BadRequest("Avaliação não encontrada");
        if (requester.role !== "admin" && requester.id !== evaluation.userId) {
            throw new Forbidden("Acesso negado");
        }
        if (!evaluation.sexo) throw new BadRequest("Campo 'sexo' é obrigatório para o cálculo.");
        if (evaluation.idade == null) {
            const age = getAgeYearsAt(evaluation.user?.dataNascimento, evaluation.measuredAt);
            evaluation.idade = age ?? 0;
        }
        
        const r = await AnthropometryCalculator.runAndPersist(method, evaluation);
        if (r?.percentualGordura != null) {
            await syncMetricsFromEvaluation(evaluation, { gorduraCorporal: Number(r.percentualGordura) });
        }

        return [r];
    },

    async getEvaluationWithResults(id: number, requester: { id: number; role: string }) {
        const evaluation = await evalRepo().findOne({ where: { id }, relations: ["user"] });
        if (!evaluation) throw new BadRequest("Avaliação não encontrada");
        if (requester.role !== "admin" && requester.id !== evaluation.userId) {
            throw new Forbidden("Acesso negado");
        }
        const results = await resRepo().find({ where: { evaluation: { id } }, order: { createdAt: "DESC" } });
        return { evaluation, results };
    },

    async listByUser(userId: number, opts: { page: number; perPage: number; from?: Date; to?: Date }, requester: { id: number; role: string }) {
        if (requester.role !== "admin" && requester.id !== userId) {
            throw new Forbidden("Acesso negado");
        }
        const qb = evalRepo()
            .createQueryBuilder("e")
            .where("e.user_id = :userId", { userId })
            .orderBy("e.measured_at", "DESC")
            .skip((opts.page - 1) * opts.perPage)
            .take(opts.perPage);

        if (opts.from || opts.to) {
            const { start, end } = betweenDates(opts.from, opts.to);
            qb.andWhere("e.measured_at BETWEEN :start AND :end", { start, end });
        }

        const [items, total] = await qb.getManyAndCount();
        return { items, total, page: opts.page, perPage: opts.perPage };
    },

    async getLatestByUser(userId: number, requester: { id: number; role: string }) {
        if (requester.role !== "admin" && requester.id !== userId) {
            throw new Forbidden("Acesso negado");
        }
        const evaluation = await evalRepo().findOne({
            where: { userId },
            order: { measuredAt: "DESC" },
        });
        if (!evaluation) return null;
        const results = await resRepo().find({
            where: { evaluation: { id: evaluation.id } },
            order: { createdAt: "DESC" },
        });
        return { evaluation, results };
    },
};

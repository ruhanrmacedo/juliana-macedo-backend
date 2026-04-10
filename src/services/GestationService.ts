// services/GestationService.ts
import { AppDataSource } from "../config/ormconfig";
import { BadRequest, Forbidden } from "../models/anthropometry/calculators/utils/errors";
import { normalizeNumber } from "../models/anthropometry/calculators/utils/number";
import { GestationTracking } from "../models/GestationTracking";
import { GestationVisit } from "../models/GestationVisit";
import { GestationType } from "../models/enums/GestationType";
import { toDateOnlyString, weeksBetween, parseDate } from "../utils/date-utils";
import { AnthropometryEvaluation } from "../models/anthropometry/AnthropometryEvaluation";

const trackingRepo = () => AppDataSource.getRepository(GestationTracking);
const visitRepo = () => AppDataSource.getRepository(GestationVisit);

// chave de dia robusta em UTC ISO
const isoDay = (d: Date | string) =>
    (d instanceof Date ? d.toISOString() : new Date(d as any).toISOString()).slice(0, 10);

type StartInput = {
    userId?: number;
    pesoPreGestacional: number | string;
    alturaCm: number | string;
    dum: string | Date;
    idadeGestacionalInicio?: number;
    tipo?: GestationType;
};

export const GestationService = {
    async start(input: StartInput, requester: { id: number; role: string }) {
        const userId = input.userId ?? requester.id;
        if (!userId || isNaN(userId)) throw new BadRequest("ID do usuário inválido");

        const canManage = requester.role === "admin" || requester.role === "professional";
        if (!canManage && userId !== requester.id) {
            throw new Forbidden("Sem permissão para iniciar acompanhamento de outro usuário.");
        }

        const active = await trackingRepo().findOne({ where: { userId } });
        if (active) throw new BadRequest("Já existe acompanhamento gestacional ativo.");

        const peso = normalizeNumber(input.pesoPreGestacional);
        const altura = normalizeNumber(input.alturaCm);
        if (!peso || !altura) throw new BadRequest("Peso/altura inválidos.");

        const bmi = +(peso / Math.pow(altura / 100, 2)).toFixed(1);
        const bmiClass = classifyBMI(bmi);
        const tipo = input.tipo ?? GestationType.UNICA;

        const { min, max } = goalsByBMIAndType(bmiClass, tipo);

        let dumDate: Date;
        try { dumDate = parseDate(input.dum); }
        catch (e) { throw new BadRequest(`DUM inválida: ${(e as Error).message}`); }

        let idadeGestacionalInicio = input.idadeGestacionalInicio;
        if (idadeGestacionalInicio == null) {
            try { idadeGestacionalInicio = weeksBetween(dumDate, new Date()); }
            catch (e) { throw new BadRequest(`Erro ao calcular idade gestacional: ${(e as Error).message}`); }
        }

        if (idadeGestacionalInicio < 0 || idadeGestacionalInicio > 42) {
            throw new BadRequest("Idade gestacional deve estar entre 0 e 42 semanas");
        }

        const tracking = trackingRepo().create({
            userId,
            pesoPreGestacional: peso,
            alturaCm: altura,
            dum: dumDate,
            idadeGestacionalInicio,
            tipoGestacao: tipo,
            bmiPre: bmi,
            bmiClass,
            metaGanhoMinKg: min,
            metaGanhoMaxKg: max,
        });

        return await trackingRepo().save(tracking);
    },

    async getCurrentByUser(userId: number, requester: { id: number; role: string }) {
        if (!Number.isFinite(userId)) throw new BadRequest("ID do usuário inválido");

        const canManage = requester.role === "admin" || requester.role === "professional";
        if (!canManage && userId !== requester.id) throw new Forbidden("Sem permissão.");

        const t = await trackingRepo().findOne({ where: { userId } });
        if (!t) return null;

        const dumDate = new Date(t.dum as any);
        const idadeGestacionalAtual = weeksBetween(dumDate, new Date());

        const lastVisit = await visitRepo().findOne({
            where: { trackingId: t.id },
            order: { data: "DESC", id: "DESC" },
        });

        const pesoAtual = lastVisit?.pesoKg ?? Number(t.pesoPreGestacional);
        const imcAtual = +(pesoAtual / Math.pow(Number(t.alturaCm) / 100, 2)).toFixed(1);
        const ganhoAcumuladoKg = +(pesoAtual - Number(t.pesoPreGestacional)).toFixed(1);

        const createdIso =
            t.createdAt instanceof Date ? t.createdAt.toISOString() : new Date(t.createdAt as any).toISOString();

        return {
            id: t.id,
            userId: t.userId,
            dum: toDateOnlyString(new Date(t.dum as any)),
            bmiPre: Number(t.bmiPre),
            bmiClass: t.bmiClass,
            metaGanhoMinKg: Number(t.metaGanhoMinKg),
            metaGanhoMaxKg: Number(t.metaGanhoMaxKg),
            pesoPreGestacional: Number(t.pesoPreGestacional),
            alturaCm: Number(t.alturaCm),
            tipoGestacao: t.tipoGestacao,
            idadeGestacionalInicio: t.idadeGestacionalInicio ?? null,
            dataPrimeiroAcompanhamento: createdIso,
            idadeGestacionalAtual,
            pesoAtual,
            imcAtual,
            ganhoAcumuladoKg,
        };
    },

    async addVisit(
        trackingId: number,
        payload: {
            data: string | Date;
            pesoKg: number | string;
            idadeGestacional?: number;
            paSistolica?: number;
            paDiastolica?: number;
            observacoes?: string;
            cinturaCm?: number;
        },
        requester: { id: number; role: string }
    ) {
        if (!trackingId || isNaN(trackingId)) throw new BadRequest("ID do acompanhamento inválido");

        const tracking = await trackingRepo().findOne({ where: { id: trackingId } });
        if (!tracking) throw new BadRequest("Acompanhamento não encontrado.");

        const canManage = requester.role === "admin" || requester.role === "professional";
        if (!canManage && tracking.userId !== requester.id) throw new Forbidden("Sem permissão.");

        const peso = normalizeNumber(payload.pesoKg);
        if (!peso) throw new BadRequest("Peso inválido.");

        let date: Date;
        try { date = parseDate(payload.data); }
        catch (e) { throw new BadRequest(`Data da visita inválida: ${(e as Error).message}`); }

        let semanas = payload.idadeGestacional;
        if (!semanas) {
            try { semanas = weeksBetween(new Date(tracking.dum), date); }
            catch (e) { throw new BadRequest(`Erro ao calcular idade gestacional: ${(e as Error).message}`); }
        }
        if (semanas < 0 || semanas > 42) throw new BadRequest("Idade gestacional deve estar entre 0 e 42 semanas");

        const trimestre = trimesterFromWeeks(semanas);
        const cintura = payload.cinturaCm != null ? normalizeNumber(payload.cinturaCm) : undefined;

        const v = visitRepo().create({
            trackingId,
            data: date,
            pesoKg: peso,
            idadeGestacional: semanas,
            trimestre,
            paSistolica: payload.paSistolica,
            paDiastolica: payload.paDiastolica,
            observacoes: payload.observacoes,
            cinturaCm: cintura, // <- **salvamos na própria visita**
        });
        const saved = await visitRepo().save(v);

        // --- Sincroniza com AnthropometryEvaluation (UPSERT por dia) ---
        if (cintura != null || payload.pesoKg != null) {
            const pesoDoDia = payload.pesoKg != null ? normalizeNumber(payload.pesoKg) : undefined;
            const evalRepo = AppDataSource.getRepository(AnthropometryEvaluation);

            const d0 = new Date(date); d0.setUTCHours(0, 0, 0, 0);
            const d1 = new Date(date); d1.setUTCHours(23, 59, 59, 999);

            const ae = await evalRepo
                .createQueryBuilder("e")
                .where("e.user_id = :userId", { userId: tracking.userId })
                .andWhere("e.measured_at BETWEEN :d0 AND :d1", { d0, d1 })
                .orderBy("e.updated_at", "DESC")
                .getOne();

            if (ae) {
                if (cintura != null && !isNaN(cintura)) ae.cintura_cm = cintura;
                if (pesoDoDia != null && !isNaN(pesoDoDia)) ae.peso = Number(pesoDoDia);
                await evalRepo.save(ae);
            } else {
                const newEval = evalRepo.create({
                    userId: tracking.userId,
                    measuredAt: new Date(date),
                    cintura_cm: (cintura != null && !isNaN(cintura)) ? cintura : undefined,
                    peso: (pesoDoDia != null && !isNaN(pesoDoDia)) ? Number(pesoDoDia) : undefined,
                });
                await evalRepo.save(newEval);
            }
        }

        return saved;
    },

    async listVisits(
        trackingId: number,
        requester: { id: number; role: string },
        opts?: { includeAnthro?: boolean }
    ) {
        if (!Number.isFinite(trackingId)) throw new BadRequest("ID do acompanhamento inválido");

        const tracking = await trackingRepo().findOne({ where: { id: trackingId } });
        if (!tracking) throw new BadRequest("Acompanhamento não encontrado.");

        const canManage = requester.role === "admin" || requester.role === "professional";
        if (!canManage && tracking.userId !== requester.id) throw new Forbidden("Sem permissão.");

        const visits = await visitRepo().find({
            where: { trackingId },
            order: { data: "ASC", id: "ASC" },
        });

        // 1) Se não pediu antropometria ou não há visitas, já retorna
        if (!opts?.includeAnthro || visits.length === 0) return visits;

        // 2) Fallback: só busca AE para preencher visitas SEM cintura
        const missing = visits.filter(v => v.cinturaCm == null);
        if (missing.length === 0) return visits;

        const firstDate = new Date(missing[0].data as any);
        const lastDate = new Date(missing[missing.length - 1].data as any);

        const evalRepo = AppDataSource.getRepository(AnthropometryEvaluation);
        const raw = await evalRepo
            .createQueryBuilder("e")
            .select(["e.measured_at", "e.cintura_cm"])
            .where("e.user_id = :userId", { userId: tracking.userId })
            .andWhere("e.measured_at::date BETWEEN :d0::date AND :d1::date", { d0: firstDate, d1: lastDate })
            .distinctOn(["e.measured_at::date"])
            .orderBy("e.measured_at::date", "ASC")
            .addOrderBy("e.updated_at", "DESC")
            .getRawMany<{ e_measured_at: string; e_cintura_cm: string | number | null }>();

        const byDay = new Map<string, number | undefined>();
        for (const r of raw) {
            const day = String(r.e_measured_at).slice(0, 10);
            const cint = r.e_cintura_cm != null ? Number(r.e_cintura_cm) : undefined;
            byDay.set(day, cint);
        }

        return visits.map(v => {
            if (v.cinturaCm != null) return v;
            const key = isoDay(v.data as any);
            const cint = byDay.get(key);
            return { ...v, cinturaCm: cint };
        });
    },
};

// helpers
function classifyBMI(bmi: number): "UNDER" | "NORMAL" | "OVER" | "OBESE" {
    if (bmi < 18.5) return "UNDER";
    if (bmi < 25) return "NORMAL";
    if (bmi < 30) return "OVER";
    return "OBESE";
}
function goalsByBMIAndType(bmiClass: "UNDER" | "NORMAL" | "OVER" | "OBESE", tipo: GestationType) {
    if (tipo !== GestationType.UNICA) return { min: 15, max: 24 };
    switch (bmiClass) {
        case "UNDER": return { min: 12.5, max: 18 };
        case "NORMAL": return { min: 11.5, max: 16 };
        case "OVER": return { min: 6.8, max: 11.3 };
        case "OBESE": return { min: 5, max: 9 };
    }
}
function trimesterFromWeeks(weeks?: number): 1 | 2 | 3 {
    if (!weeks || weeks <= 13) return 1;
    if (weeks <= 27) return 2;
    return 3;
}

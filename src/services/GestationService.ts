import { AppDataSource } from "../config/ormconfig";
import { BadRequest, Forbidden, normalizeNumber } from "../models/anthropometry/calculators/utils/errors";
import { GestationTracking } from "../models/GestationTracking";
import { GestationVisit } from "../models/GestationVisit";
import { GestationType } from "../models/enums/GestationType";
import { toDateOnlyString, weeksBetween, parseDate } from "../utils/date-utils";

const trackingRepo = () => AppDataSource.getRepository(GestationTracking);
const visitRepo = () => AppDataSource.getRepository(GestationVisit);

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
        // Validar userId
        const userId = input.userId ?? requester.id;
        if (!userId || isNaN(userId)) {
            throw new BadRequest("ID do usuário inválido");
        }

        if (requester.role !== "admin" && userId !== requester.id) {
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

        // Validar e converter DUM
        let dumDate: Date;
        try {
            dumDate = parseDate(input.dum);
        } catch (error) {
            throw new BadRequest(`DUM inválida: ${(error as Error).message}`);
        }

        // Calcular idade gestacional inicial se não fornecida
        let idadeGestacionalInicio = input.idadeGestacionalInicio;
        if (idadeGestacionalInicio === undefined || idadeGestacionalInicio === null) {
            try {
                idadeGestacionalInicio = weeksBetween(dumDate, new Date());
            } catch (error) {
                throw new BadRequest(`Erro ao calcular idade gestacional: ${(error as Error).message}`);
            }
        }

        // Validar idade gestacional
        if (idadeGestacionalInicio < 0 || idadeGestacionalInicio > 42) {
            throw new BadRequest("Idade gestacional deve estar entre 0 e 42 semanas");
        }

        const tracking = trackingRepo().create({
            userId,
            pesoPreGestacional: peso,
            alturaCm: altura,
            dum: dumDate, // Manter como Date, o TypeORM vai converter para o tipo correto
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
        // Validar userId
        if (!userId || isNaN(userId)) {
            throw new BadRequest("ID do usuário inválido");
        }

        if (requester.role !== "admin" && userId !== requester.id) {
            throw new Forbidden("Sem permissão.");
        }
        return await trackingRepo().findOne({ where: { userId } });
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
        },
        requester: { id: number; role: string }
    ) {
        // Validar trackingId
        if (!trackingId || isNaN(trackingId)) {
            throw new BadRequest("ID do acompanhamento inválido");
        }

        const tracking = await trackingRepo().findOne({ where: { id: trackingId } });
        if (!tracking) throw new BadRequest("Acompanhamento não encontrado.");

        if (requester.role !== "admin" && tracking.userId !== requester.id) {
            throw new Forbidden("Sem permissão.");
        }

        const peso = normalizeNumber(payload.pesoKg);
        if (!peso) throw new BadRequest("Peso inválido.");

        // Validar e converter data da visita
        let date: Date;
        try {
            date = parseDate(payload.data);
        } catch (error) {
            throw new BadRequest(`Data da visita inválida: ${(error as Error).message}`);
        }

        let semanas = payload.idadeGestacional;
        if (!semanas) {
            try {
                // Calcular idade gestacional baseada na DUM e data da visita
                semanas = weeksBetween(new Date(tracking.dum), date);
            } catch (error) {
                throw new BadRequest(`Erro ao calcular idade gestacional: ${(error as Error).message}`);
            }
        }

        // Validar idade gestacional
        if (semanas < 0 || semanas > 42) {
            throw new BadRequest("Idade gestacional deve estar entre 0 e 42 semanas");
        }

        const trimestre = trimesterFromWeeks(semanas);

        const v = visitRepo().create({
            trackingId,
            data: date, // Manter como Date, o TypeORM vai converter
            pesoKg: peso,
            idadeGestacional: semanas,
            trimestre,
            paSistolica: payload.paSistolica,
            paDiastolica: payload.paDiastolica,
            observacoes: payload.observacoes,
        });

        return await visitRepo().save(v);
    },

    async listVisits(trackingId: number, requester: { id: number; role: string }) {
        // Validar trackingId
        if (!trackingId || isNaN(trackingId)) {
            throw new BadRequest("ID do acompanhamento inválido");
        }

        const tracking = await trackingRepo().findOne({ where: { id: trackingId } });
        if (!tracking) throw new BadRequest("Acompanhamento não encontrado.");
        if (requester.role !== "admin" && tracking.userId !== requester.id) {
            throw new Forbidden("Sem permissão.");
        }
        return await visitRepo().find({
            where: { trackingId },
            order: { data: "ASC", id: "ASC" },
        });
    },
};

// Helpers
function classifyBMI(bmi: number): "UNDER" | "NORMAL" | "OVER" | "OBESE" {
    if (bmi < 18.5) return "UNDER";
    if (bmi < 25) return "NORMAL";
    if (bmi < 30) return "OVER";
    return "OBESE";
}

function goalsByBMIAndType(
    bmiClass: "UNDER" | "NORMAL" | "OVER" | "OBESE",
    tipo: GestationType
): { min: number; max: number } {
    // IOM (gestação UNICA). Para GEMELAR/TRIGEMELAR mantemos intervalo provisório amplo.
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
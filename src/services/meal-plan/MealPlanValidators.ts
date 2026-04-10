import { BadRequest } from "../../models/anthropometry/calculators/utils/errors";

export const TIME_REGEX = /^\d{2}:\d{2}(?::\d{2})?$/;

export const toPositiveInt = (value: number | string | undefined | null, fieldName: string) => {
    if (value === undefined || value === null || value === "") throw new BadRequest(fieldName + " é obrigatório.");
    const numeric = typeof value === "string" ? Number(value) : value;
    if (!Number.isInteger(numeric) || numeric <= 0) throw new BadRequest(fieldName + " inválido.");
    return numeric;
};

export const validateWeekday = (weekday: number | null | undefined) => {
    if (weekday === null || weekday === undefined) return undefined;
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6)
        throw new BadRequest("Dia da semana inválido. Utilize valores entre 0 (domingo) e 6 (sábado).");
    return weekday;
};

export const validateScheduledTime = (value: string | null | undefined) => {
    if (value === undefined || value === null || value === "") return undefined;
    const trimmed = value.trim();
    if (!TIME_REGEX.test(trimmed)) throw new BadRequest("Horário inválido: " + trimmed);
    return trimmed.length === 5 ? trimmed + ":00" : trimmed;
};

export const toDecimalString = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === "") return undefined;
    if (typeof value === "number") {
        if (!Number.isFinite(value)) throw new BadRequest("Valor numérico inválido.");
        return value.toString();
    }
    return value.trim();
};

import { BadRequest } from "../../models/anthropometry/calculators/utils/errors";

export const ensureSingleDefault = (items: { isDefault?: boolean }[], label: string) => {
    const defaults = items.filter(i => i.isDefault);
    if (defaults.length > 1) throw new BadRequest(`Apenas uma ${label} pode ser marcada como padrão.`);
};

export const assertValidId = (id: number, label = "ID") => {
    if (!Number.isInteger(id) || id <= 0) throw new BadRequest(`${label} inválido.`);
};

import { BadRequest } from "./errors";

export function normalizeNumber(v: unknown): number {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
        const s = v.replace(/\s+/g, "").replace(",", ".");
        const n = Number(s);
        if (Number.isNaN(n)) throw new BadRequest(`Valor numérico inválido: ${v}`); // <- aqui
        return n;
    }
    throw new BadRequest(`Tipo inválido para número: ${typeof v}`); // <- aqui
}
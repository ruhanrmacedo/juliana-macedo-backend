export function normalizeNumber(v: unknown): number {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
        const s = v.replace(/\s+/g, "").replace(",", ".");
        const n = Number(s);
        if (Number.isNaN(n)) throw new Error(`Valor numérico inválido: ${v}`);
        return n;
    }
    throw new Error(`Tipo inválido para número: ${typeof v}`);
}
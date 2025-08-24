export class BadRequest extends Error { status = 400; constructor(msg: string) { super(msg); } }
export class Forbidden extends Error { status = 403; constructor(msg: string) { super(msg); } }

export function requireFields(obj: any, fields: string[]) {
    const missing = fields.filter(f => obj[f] === undefined || obj[f] === null);
    if (missing.length) throw new BadRequest(`Campos obrigatórios: ${missing.join(", ")}`);
}

export { normalizeNumber } from "./number";
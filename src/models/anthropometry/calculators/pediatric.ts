import { AnthropometryMethod } from "../../enums/AnthropometryMethod";
import { AnthropometryEvaluation } from "../AnthropometryEvaluation";
import { AnthropometryResult } from "../AnthropometryResult";
import { BadRequest } from "./utils/errors";


// TODO: carregar tabelas LMS OMS e helpers de z-score
function classifyBAZ(z: number): string {
    if (z <= -3) return "magreza grave";
    if (z > -3 && z < -2) return "magreza";
    if (z >= -2 && z <= +1) return "eutrofia";
    if (z > +1 && z <= +2) return "sobrepeso";
    if (z > +2 && z <= +3) return "obesidade";
    return "obesidade grave";
}

export async function calcWHO_BAZ(e: AnthropometryEvaluation): Promise<AnthropometryResult> {
    if (e.peso == null || e.altura == null) throw new BadRequest("Peso e altura são obrigatórios");
    const z = 0; // TODO calcular via LMS
    const r = new AnthropometryResult();
    r.method = AnthropometryMethod.WHO_BAZ;
    r.zScore = z;
    r.percentil = undefined; // opcional
    r.classificacao = classifyBAZ(z);
    r.parametrosJson = { note: "TODO: aplicar LMS OMS BAZ" };
    return r;
}

export async function calcWHO_HAZ(e: AnthropometryEvaluation): Promise<AnthropometryResult> {
    if (e.altura == null) throw new BadRequest("Altura é obrigatória");
    const z = 0; // TODO
    const r = new AnthropometryResult();
    r.method = AnthropometryMethod.WHO_HAZ;
    r.zScore = z;
    r.classificacao = undefined;
    r.parametrosJson = { note: "TODO: HAZ via LMS" };
    return r;
}

export async function calcWHO_WHZ(e: AnthropometryEvaluation): Promise<AnthropometryResult> {
    if (e.peso == null || e.altura == null) throw new BadRequest("Peso e estatura/comprimento são obrigatórios");
    const z = 0; // TODO
    const r = new AnthropometryResult();
    r.method = AnthropometryMethod.WHO_WHZ;
    r.zScore = z;
    r.parametrosJson = { note: "TODO: WHZ/WFL via LMS" };
    return r;
}

export async function calcSlaughter(e: AnthropometryEvaluation): Promise<AnthropometryResult> {
    if (e.triceps_mm == null || e.subescapular_mm == null) {
        throw new BadRequest("TR e SB são obrigatórios para Slaughter");
    }
    const TR = Number(e.triceps_mm);
    const SB = Number(e.subescapular_mm);
    const S = TR + SB;

    // Slaughter et al. 1988 — %G por sexo
    const pg = e.sexo === "M"
        ? 1.21 * S - 0.008 * (S * S) - 1.7
        : 1.33 * S - 0.013 * (S * S) - 2.5;

    const r = new AnthropometryResult();
    r.method = AnthropometryMethod.SLAUGHTER;
    r.percentualGordura = +pg.toFixed(2);
    r.parametrosJson = { S, formula: `Slaughter ${e.sexo}` };
    return r;
}

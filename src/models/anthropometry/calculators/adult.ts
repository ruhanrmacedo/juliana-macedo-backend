import { AnthropometryMethod } from "../../enums/AnthropometryMethod";
import { AnthropometryEvaluation } from "../AnthropometryEvaluation";
import { AnthropometryResult } from "../AnthropometryResult";
import { BadRequest } from "./utils/errors";
import { kgFat, kgLean, siriFromDc } from "./utils/siri";


// Helpers
function requireDobras(e: AnthropometryEvaluation, keys: (keyof AnthropometryEvaluation)[]) {
    const missing = keys.filter(k => (e as any)[k] == null);
    if (missing.length) throw new BadRequest(`Faltam dobras: ${missing.join(", ")}`);
}

export async function calcDW(e: AnthropometryEvaluation): Promise<AnthropometryResult> {
    requireDobras(e, ["triceps_mm", "biceps_mm", "subescapular_mm", "supra_iliaca_mm"]);
    // TODO fórmulas por sexo/faixa etária → densidade
    const densidade = 1.05; // placeholder
    const pg = siriFromDc(densidade);
    const r = new AnthropometryResult();
    r.method = AnthropometryMethod.DURNIN_WOMERSLEY;
    r.densidadeCorp = densidade;
    r.percentualGordura = pg;
    if (e.peso != null) {
        r.massaGordaKg = kgFat(Number(e.peso), pg);
        r.massaMagraKg = kgLean(Number(e.peso), pg);
    }
    r.parametrosJson = { note: "TODO: aplicar coeficientes reais DW" };
    return r;
}

export async function calcFaulkner(e: AnthropometryEvaluation): Promise<AnthropometryResult> {
    requireDobras(e, ["triceps_mm", "subescapular_mm", "supra_iliaca_mm", "abdominal_mm"]);
    // TODO fórmula Faulkner %G direto
    const percentual = 20; // placeholder
    const r = new AnthropometryResult();
    r.method = AnthropometryMethod.FAULKNER;
    r.percentualGordura = percentual;
    if (e.peso != null) {
        r.massaGordaKg = kgFat(Number(e.peso), percentual);
        r.massaMagraKg = kgLean(Number(e.peso), percentual);
    }
    r.parametrosJson = { note: "TODO: coeficientes Faulkner" };
    return r;
}

export async function calcGuedes(e: AnthropometryEvaluation): Promise<AnthropometryResult> {
    // TODO fórmulas BR → densidade → Siri
    const densidade = 1.05;
    const pg = siriFromDc(densidade);
    const r = new AnthropometryResult();
    r.method = AnthropometryMethod.GUEDES;
    r.densidadeCorp = densidade;
    r.percentualGordura = pg;
    if (e.peso != null) {
        r.massaGordaKg = kgFat(Number(e.peso), pg);
        r.massaMagraKg = kgLean(Number(e.peso), pg);
    }
    r.parametrosJson = { note: "TODO: Guedes H/M" };
    return r;
}

export async function calcJP3(e: AnthropometryEvaluation): Promise<AnthropometryResult> {
    // H: CH+AB+CX | M(JPW3): TR+SI+CX — decidiremos pela flag sexo na fórmula real
    const densidade = 1.05; // TODO JP3/JPW3
    const pg = siriFromDc(densidade);
    const r = new AnthropometryResult();
    r.method = AnthropometryMethod.JACKSON_POLLOCK_3;
    r.densidadeCorp = densidade;
    r.percentualGordura = pg;
    if (e.peso != null) {
        r.massaGordaKg = kgFat(Number(e.peso), pg);
        r.massaMagraKg = kgLean(Number(e.peso), pg);
    }
    r.parametrosJson = { note: "TODO: JP3 masculino" };
    return r;
}

export async function calcJP7(e: AnthropometryEvaluation): Promise<AnthropometryResult> {
    const densidade = 1.05; // TODO JP7
    const pg = siriFromDc(densidade);
    const r = new AnthropometryResult();
    r.method = AnthropometryMethod.JACKSON_POLLOCK_7;
    r.densidadeCorp = densidade;
    r.percentualGordura = pg;
    if (e.peso != null) {
        r.massaGordaKg = kgFat(Number(e.peso), pg);
        r.massaMagraKg = kgLean(Number(e.peso), pg);
    }
    r.parametrosJson = { note: "TODO: JP7" };
    return r;
}

export async function calcJPW3(e: AnthropometryEvaluation): Promise<AnthropometryResult> {
    // Mulher: TR+SI+CX → densidade → Siri
    const densidade = 1.05; // TODO JPW3
    const pg = siriFromDc(densidade);
    const r = new AnthropometryResult();
    r.method = AnthropometryMethod.JACKSON_POLLOCK_WARD_3;
    r.densidadeCorp = densidade;
    r.percentualGordura = pg;
    if (e.peso != null) {
        r.massaGordaKg = kgFat(Number(e.peso), pg);
        r.massaMagraKg = kgLean(Number(e.peso), pg);
    }
    r.parametrosJson = { note: "TODO: JPW3 feminino" };
    return r;
}

export async function calcJPW7(e: AnthropometryEvaluation): Promise<AnthropometryResult> {
    const densidade = 1.05; // TODO JPW7
    const pg = siriFromDc(densidade);
    const r = new AnthropometryResult();
    r.method = AnthropometryMethod.JACKSON_POLLOCK_WARD_7;
    r.densidadeCorp = densidade;
    r.percentualGordura = pg;
    if (e.peso != null) {
        r.massaGordaKg = kgFat(Number(e.peso), pg);
        r.massaMagraKg = kgLean(Number(e.peso), pg);
    }
    r.parametrosJson = { note: "TODO: JPW7 feminino" };
    return r;
}

export async function calcPetroski(e: AnthropometryEvaluation): Promise<AnthropometryResult> {
    const densidade = 1.05; // TODO Petroski
    const pg = siriFromDc(densidade);
    const r = new AnthropometryResult();
    r.method = AnthropometryMethod.PETROSKI;
    r.densidadeCorp = densidade;
    r.percentualGordura = pg;
    if (e.peso != null) {
        r.massaGordaKg = kgFat(Number(e.peso), pg);
        r.massaMagraKg = kgLean(Number(e.peso), pg);
    }
    r.parametrosJson = { note: "TODO: Petroski" };
    return r;
}
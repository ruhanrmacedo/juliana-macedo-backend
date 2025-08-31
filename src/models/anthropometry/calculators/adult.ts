import { AnthropometryMethod } from "../../enums/AnthropometryMethod";
import { AnthropometryEvaluation } from "../AnthropometryEvaluation";
import { AnthropometryResult } from "../AnthropometryResult";
import { BadRequest } from "./utils/errors";
import { kgFat, kgLean, siriFromDc } from "./utils/siri";

// ========== Helpers ==========
function requireDobras(e: AnthropometryEvaluation, keys: (keyof AnthropometryEvaluation)[]) {
    const missing = keys.filter(k => (e as any)[k] == null);
    if (missing.length) throw new BadRequest(`Faltam dobras: ${missing.join(", ")}`);
}

function needAge(e: AnthropometryEvaluation) {
    if (e.idade == null) throw new BadRequest("Idade é obrigatória para este método");
    return Number(e.idade);
}

function num(v: number | undefined, field: string) {
    if (v == null) throw new BadRequest(`Campo obrigatório: ${field}`);
    return Number(v);
}

function buildResult(
    method: AnthropometryMethod,
    Dc: number,
    e: AnthropometryEvaluation,
    extra?: Record<string, unknown>
) {
    const pg = siriFromDc(Dc);
    const r = new AnthropometryResult();
    r.method = method;
    r.densidadeCorp = +Dc.toFixed(6);
    r.percentualGordura = +pg.toFixed(2);
    if (e.peso != null) {
        r.massaGordaKg = kgFat(Number(e.peso), pg);
        r.massaMagraKg = kgLean(Number(e.peso), pg);
    }
    r.parametrosJson = extra;
    return r;
}

// ========== Jackson & Pollock — 3 dobras (Homens) ==========
export async function calcJP3(e: AnthropometryEvaluation): Promise<AnthropometryResult> {
    // Homens: Peitoral/Tórax + Abdominal + Coxa
    requireDobras(e, ["peitoral_torax_mm", "abdominal_mm", "coxa_mm"]);
    const age = needAge(e);
    const CH = num(e.peitoral_torax_mm, "peitoral_torax_mm");
    const AB = num(e.abdominal_mm, "abdominal_mm");
    const CX = num(e.coxa_mm, "coxa_mm");
    const S = CH + AB + CX;

    // Dc = 1.10938 − 0.0008267·S + 0.0000016·S² − 0.0002574·idade
    const Dc = 1.10938 - 0.0008267 * S + 0.0000016 * (S * S) - 0.0002574 * age;

    return buildResult(AnthropometryMethod.JACKSON_POLLOCK_3, Dc, e, {
        S,
        sites: ["peitoral_torax_mm", "abdominal_mm", "coxa_mm"],
        formula: "Jackson & Pollock 3-sítios (homens)",
    });
}

// ========== Jackson, Pollock & Ward — 3 dobras (Mulheres) ==========
export async function calcJPW3(e: AnthropometryEvaluation): Promise<AnthropometryResult> {
    // Mulheres: Tríceps + Supra-ilíaca + Coxa
    requireDobras(e, ["triceps_mm", "supra_iliaca_mm", "coxa_mm"]);
    const age = needAge(e);
    const TR = num(e.triceps_mm, "triceps_mm");
    const SI = num(e.supra_iliaca_mm, "supra_iliaca_mm");
    const CX = num(e.coxa_mm, "coxa_mm");
    const S = TR + SI + CX;

    // Dc = 1.0994921 − 0.0009929·S + 0.0000023·S² − 0.0001392·idade
    const Dc = 1.0994921 - 0.0009929 * S + 0.0000023 * (S * S) - 0.0001392 * age;

    return buildResult(AnthropometryMethod.JACKSON_POLLOCK_WARD_3, Dc, e, {
        S,
        sites: ["triceps_mm", "supra_iliaca_mm", "coxa_mm"],
        formula: "Jackson, Pollock & Ward 3-sítios (mulheres)",
    });
}

// ========== Jackson & Pollock — 7 dobras (Homens e Mulheres) ==========
export async function calcJP7(e: AnthropometryEvaluation): Promise<AnthropometryResult> {
    requireDobras(e, [
        "peitoral_torax_mm",
        "axilar_media_mm",
        "triceps_mm",
        "subescapular_mm",
        "abdominal_mm",
        "supra_iliaca_mm",
        "coxa_mm",
    ]);
    const age = needAge(e);
    const vals = [
        num(e.peitoral_torax_mm, "peitoral_torax_mm"),
        num(e.axilar_media_mm, "axilar_media_mm"),
        num(e.triceps_mm, "triceps_mm"),
        num(e.subescapular_mm, "subescapular_mm"),
        num(e.abdominal_mm, "abdominal_mm"),
        num(e.supra_iliaca_mm, "supra_iliaca_mm"),
        num(e.coxa_mm, "coxa_mm"),
    ];
    const S = vals.reduce((a, b) => a + b, 0);

    let Dc: number;
    if (e.sexo === "M") {
        // Homens: Dc = 1.112 − 0.00043499·S + 0.00000055·S² − 0.00028826·idade
        Dc = 1.112 - 0.00043499 * S + 0.00000055 * (S * S) - 0.00028826 * age;
    } else {
        // Mulheres: Dc = 1.097 − 0.00046971·S + 0.00000056·S² − 0.00012828·idade
        Dc = 1.097 - 0.00046971 * S + 0.00000056 * (S * S) - 0.00012828 * age;
    }

    return buildResult(AnthropometryMethod.JACKSON_POLLOCK_7, Dc, e, {
        S,
        sites: [
            "peitoral_torax_mm",
            "axilar_media_mm",
            "triceps_mm",
            "subescapular_mm",
            "abdominal_mm",
            "supra_iliaca_mm",
            "coxa_mm",
        ],
        formula: `Jackson & Pollock 7-sítios (${e.sexo})`,
    });
}

// ========== Jackson, Pollock & Ward — 7 dobras (alias p/ JP7 feminino) ==========
export async function calcJPW7(e: AnthropometryEvaluation): Promise<AnthropometryResult> {
    // Muitas práticas tratam “JPW7” como a variante feminina de 7 dobras.
    // Aqui redirecionamos para JP7 com os coeficientes femininos (já tratados em calcJP7).
    if (e.sexo !== "F") {
        throw new BadRequest("JPW7 é aplicável apenas ao sexo feminino.");
    }
    return calcJP7(e);
}

// ========== Durnin & Womersley (1974) ==========
export async function calcDW(e: AnthropometryEvaluation): Promise<AnthropometryResult> {
    // Dobras: tríceps, bíceps, subescapular, supra-ilíaca
    requireDobras(e, ["triceps_mm", "biceps_mm", "subescapular_mm", "supra_iliaca_mm"]);
    const age = needAge(e);

    const TR = num(e.triceps_mm, "triceps_mm");
    const BI = num(e.biceps_mm, "biceps_mm");
    const SB = num(e.subescapular_mm, "subescapular_mm");
    const SI = num(e.supra_iliaca_mm, "supra_iliaca_mm");
    const S4 = TR + BI + SB + SI;
    const L = Math.log10(S4);

    // Coeficientes por faixa etária e sexo (D = a − b·L)
    // Fonte: tabela DW (1974): <17, 17–19, 20–29, 30–39, 40–49, >50
    function coeff(sexo: "M" | "F", idade: number) {
        const m = sexo === "M";
        if (idade < 17) return m ? { a: 1.1533, b: 0.0643 } : { a: 1.1369, b: 0.0598 };
        if (idade <= 19) return m ? { a: 1.1620, b: 0.0630 } : { a: 1.1549, b: 0.0678 };
        if (idade <= 29) return m ? { a: 1.1631, b: 0.0632 } : { a: 1.1599, b: 0.0717 };
        if (idade <= 39) return m ? { a: 1.1422, b: 0.0544 } : { a: 1.1423, b: 0.0632 };
        if (idade <= 49) return m ? { a: 1.1620, b: 0.0700 } : { a: 1.1333, b: 0.0612 };
      /* >=50 */        return m ? { a: 1.1715, b: 0.0779 } : { a: 1.1339, b: 0.0645 };
    }
    if (!e.sexo) throw new BadRequest("Sexo é obrigatório para Durnin & Womersley");
    const { a, b } = coeff(e.sexo, age);
    const Dc = a - b * L;

    return buildResult(AnthropometryMethod.DURNIN_WOMERSLEY, Dc, e, {
        S4,
        L: +L.toFixed(5),
        sites: ["triceps_mm", "biceps_mm", "subescapular_mm", "supra_iliaca_mm"],
        formula: `Durnin & Womersley (sexo=${e.sexo}, idade=${age})`,
    });
}

// ========== Guedes (adultos BR – 3 dobras, por sexo) ==========
export async function calcGuedes(e: AnthropometryEvaluation): Promise<AnthropometryResult> {
    if (!e.sexo) throw new BadRequest("Sexo é obrigatório para Guedes");

    let S: number;
    let sites: (keyof AnthropometryEvaluation)[];

    if (e.sexo === "M") {
        // Homens: abdominal + peitoral/torácica + supra-ilíaca
        requireDobras(e, ["abdominal_mm", "peitoral_torax_mm", "supra_iliaca_mm"]);
        const AB = num(e.abdominal_mm, "abdominal_mm");
        const CH = num(e.peitoral_torax_mm, "peitoral_torax_mm");
        const SI = num(e.supra_iliaca_mm, "supra_iliaca_mm");
        S = AB + CH + SI;
        sites = ["abdominal_mm", "peitoral_torax_mm", "supra_iliaca_mm"];
        const Dc = 1.17136 - 0.06706 * Math.log10(S);
        return buildResult(AnthropometryMethod.GUEDES, Dc, e, { S, sites, formula: "Guedes (homens)" });
    } else {
        // Mulheres: coxa + supra-ilíaca + subescapular
        requireDobras(e, ["coxa_mm", "supra_iliaca_mm", "subescapular_mm"]);
        const CX = num(e.coxa_mm, "coxa_mm");
        const SI = num(e.supra_iliaca_mm, "supra_iliaca_mm");
        const SB = num(e.subescapular_mm, "subescapular_mm");
        S = CX + SI + SB;
        sites = ["coxa_mm", "supra_iliaca_mm", "subescapular_mm"];
        const Dc = 1.16650 - 0.07063 * Math.log10(S);
        return buildResult(AnthropometryMethod.GUEDES, Dc, e, { S, sites, formula: "Guedes (mulheres)" });
    }
}

// ========== Petroski (1995) – BR ==========
export async function calcPetroski(e: AnthropometryEvaluation): Promise<AnthropometryResult> {
    if (!e.sexo) throw new BadRequest("Sexo é obrigatório para Petroski");
    const age = needAge(e);

    if (e.sexo === "M") {
        // Homens: 4 dobras (SB + CH + SI + panturrilha medial) + idade
        requireDobras(e, ["subescapular_mm", "peitoral_torax_mm", "supra_iliaca_mm", "panturrilha_medial_mm"]);
        const SB = num(e.subescapular_mm, "subescapular_mm");
        const CH = num(e.peitoral_torax_mm, "peitoral_torax_mm");
        const SI = num(e.supra_iliaca_mm, "supra_iliaca_mm");
        const PM = num(e.panturrilha_medial_mm, "panturrilha_medial_mm");
        const X = SB + CH + SI + PM;

        const Dc = 1.10726863 - 0.00081201 * X + 0.00000212 * (X * X) - 0.00041761 * age;

        return buildResult(AnthropometryMethod.PETROSKI, Dc, e, {
            X,
            sites: ["subescapular_mm", "peitoral_torax_mm", "supra_iliaca_mm", "panturrilha_medial_mm"],
            formula: "Petroski (1995) – homens (4 dobras)",
        });
    } else {
        // Mulheres: 4 dobras (axilar média + supra-ilíaca + coxa + panturrilha medial) + idade + massa + estatura
        requireDobras(e, ["axilar_media_mm", "supra_iliaca_mm", "coxa_mm", "panturrilha_medial_mm"]);
        if (e.peso == null || e.altura == null) {
            throw new BadRequest("Peso (kg) e altura (m) são obrigatórios para Petroski feminino");
        }
        const AX = num(e.axilar_media_mm, "axilar_media_mm");
        const SI = num(e.supra_iliaca_mm, "supra_iliaca_mm");
        const CX = num(e.coxa_mm, "coxa_mm");
        const PM = num(e.panturrilha_medial_mm, "panturrilha_medial_mm");
        const Y = AX + SI + CX + PM;

        const massaKg = Number(e.peso);
        const estaturaCm = Number(e.altura) * 100;

        const Dc =
            1.03465850 -
            0.00063129 * (Y * Y) -
            0.000311 * age -
            0.00048890 * massaKg +
            0.00051345 * estaturaCm;

        return buildResult(AnthropometryMethod.PETROSKI, Dc, e, {
            Y,
            massaKg,
            estaturaCm,
            sites: ["axilar_media_mm", "supra_iliaca_mm", "coxa_mm", "panturrilha_medial_mm"],
            formula: "Petroski (1995) – mulheres (4 dobras + massa + estatura + idade)",
        });
    }
}

// ========== Faulkner (1968) – %G direto (4 dobras) ==========
export async function calcFaulkner(e: AnthropometryEvaluation): Promise<AnthropometryResult> {
    requireDobras(e, ["triceps_mm", "subescapular_mm", "supra_iliaca_mm", "abdominal_mm"]);
    const TR = num(e.triceps_mm, "triceps_mm");
    const SB = num(e.subescapular_mm, "subescapular_mm");
    const SI = num(e.supra_iliaca_mm, "supra_iliaca_mm");
    const AB = num(e.abdominal_mm, "abdominal_mm");
    const S4 = TR + SB + SI + AB;

    const pg = 5.783 + 0.153 * S4; // % gordura direta

    const r = new AnthropometryResult();
    r.method = AnthropometryMethod.FAULKNER;
    r.percentualGordura = +pg.toFixed(2);
    if (e.peso != null) {
        r.massaGordaKg = kgFat(Number(e.peso), r.percentualGordura);
        r.massaMagraKg = kgLean(Number(e.peso), r.percentualGordura);
    }
    r.parametrosJson = {
        S4,
        sites: ["triceps_mm", "subescapular_mm", "supra_iliaca_mm", "abdominal_mm"],
        formula: "Faulkner (1968) – %G direto",
    };
    return r;
}
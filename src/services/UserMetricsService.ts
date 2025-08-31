// src/services/UserMetricsService.ts
import { AppDataSource } from "../config/ormconfig";
import { UserMetrics } from "../models/UserMetrics";
import { User } from "../models/User";
import { NivelAtividade } from "../models/enums/NivelAtividade";

const userMetricsRepository = AppDataSource.getRepository(UserMetrics);

/** ------------------ Helpers de parsing/normalização ------------------ */

function toNumberBR(x: any): number | undefined {
    if (x === undefined || x === null || x === "") return undefined;
    const n = parseFloat(String(x).replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
}

// Sempre retorna em METROS. Aceita metros (1.84) ou centímetros (184).
function normalizeAlturaToMeters(x: any): number {
    const v = toNumberBR(x);
    if (v === undefined) throw new Error("Altura é obrigatória.");
    // cm típicos
    if (v >= 90 && v <= 250) return +(v / 100).toFixed(2);
    // m típicos
    if (v >= 0.9 && v <= 2.5) return +v.toFixed(2);
    // erros comuns (ex.: 300) -> tenta cm
    if (v > 2.5 && v < 400) return +((v / 100).toFixed(2));
    throw new Error("Altura fora do intervalo plausível (0,90 m a 2,50 m).");
}

function assertPesoKg(x: any): number {
    const v = toNumberBR(x);
    if (v === undefined) throw new Error("Peso é obrigatório.");
    if (v < 30 || v > 400) throw new Error("Peso fora do intervalo plausível (30–400 kg).");
    return +v.toFixed(2);
}

function assertIdade(x: any): number {
    const v = Number(x);
    if (!Number.isFinite(v) || v < 5 || v > 120) {
        throw new Error("Idade fora do intervalo plausível (5–120 anos).");
    }
    return Math.round(v);
}

function assertSexo(x: any): "M" | "F" {
    if (x === "M" || x === "F") return x;
    throw new Error("Sexo inválido. Use 'M' ou 'F'.");
}

function assertGordura(x: any): number | undefined {
    if (x === undefined || x === null || x === "") return undefined;
    const v = toNumberBR(x);
    if (v === undefined) return undefined;
    if (v < 0 || v > 70) throw new Error("Gordura corporal deve estar entre 0% e 70%.");
    return +v.toFixed(2);
}

function assertNivelAtividade(x: any, fallback?: NivelAtividade): NivelAtividade {
    // Seu enum usa os VALORES com rótulos (ex.: "Sedentário", "Atleta / Muito Ativo")
    const vals = Object.values(NivelAtividade) as string[];
    if (vals.includes(x)) return x as NivelAtividade;
    if (fallback && vals.includes(fallback)) return fallback;
    throw new Error("Nível de atividade inválido.");
}

/** --------------------------------------------------------------------- */

export class UserMetricsService {
    static async createUserMetrics(
        userId: number,
        peso: any,
        altura: any,
        idade: any,
        sexo: any,
        nivelAtividade: any,
        gorduraCorporal?: any
    ) {
        const user = await AppDataSource.getRepository(User).findOne({ where: { id: userId } });
        if (!user) throw new Error("Usuário não encontrado");

        // última métrica para fallback
        const last = await userMetricsRepository.findOne({
            where: { user: { id: userId } },
            order: { createdAt: "DESC" },
        });

        // Se NÃO houver histórico ainda, exigimos todos os campos obrigatórios
        if (!last) {
            const novoPeso = assertPesoKg(peso);
            const novaAlturaM = normalizeAlturaToMeters(altura);
            const novaIdade = assertIdade(idade);
            const novoSexo = assertSexo(sexo);
            const novoNivel = assertNivelAtividade(nivelAtividade);
            const novaGordura = assertGordura(gorduraCorporal);

            const newMetrics = userMetricsRepository.create({
                user,
                peso: novoPeso,
                altura: novaAlturaM,
                idade: novaIdade,
                sexo: novoSexo,
                nivelAtividade: novoNivel,
                gorduraCorporal: novaGordura,
            });

            await userMetricsRepository.save(newMetrics);
            return newMetrics;
        }

        // Há histórico: podemos aplicar fallback campo a campo
        const has = (v: any) => v !== undefined && v !== null && v !== "";

        const pesoFinal = has(peso) ? assertPesoKg(peso) : last.peso;
        const alturaFinal = has(altura) ? normalizeAlturaToMeters(altura) : last.altura;
        const idadeFinal = has(idade) ? assertIdade(idade) : last.idade;
        const sexoFinal = has(sexo) ? assertSexo(sexo) : (last.sexo as "M" | "F");
        const nivelFinal = has(nivelAtividade)
            ? assertNivelAtividade(nivelAtividade, last.nivelAtividade)
            : last.nivelAtividade;

        const gorduraFinal = has(gorduraCorporal)
            ? assertGordura(gorduraCorporal)
            : last.gorduraCorporal;

        const newMetrics = userMetricsRepository.create({
            user,
            peso: pesoFinal,
            altura: alturaFinal,
            idade: idadeFinal,
            sexo: sexoFinal,
            nivelAtividade: nivelFinal,
            gorduraCorporal: gorduraFinal,
        });

        await userMetricsRepository.save(newMetrics);
        return newMetrics;
    }

    static async getUserMetrics(userId: number) {
        return await userMetricsRepository.find({
            where: { user: { id: userId } },
            order: { createdAt: "DESC" },
        });
    }

    static validateIMCData(metrics: UserMetrics) {
        if (!metrics.peso || !metrics.altura) {
            throw new Error("Peso e altura são necessários para calcular o IMC.");
        }
    }

    static validateTDEEData(metrics: UserMetrics) {
        if (!metrics.peso || !metrics.altura || !metrics.idade || !metrics.sexo || !metrics.nivelAtividade) {
            throw new Error("Dados insuficientes para calcular o TDEE.");
        }
    }

    static validateMacronutrientsData(metrics: UserMetrics) {
        this.validateTDEEData(metrics);
    }

    static classifyIMC(imc: number): string {
        if (imc < 18.5) return "Abaixo do peso";
        if (imc < 24.9) return "Peso normal";
        if (imc < 29.9) return "Sobrepeso";
        if (imc < 34.9) return "Obesidade grau 1";
        if (imc < 39.9) return "Obesidade grau 2";
        return "Obesidade grau 3";
    }

    static interpretTDEE(tdee: number): string {
        return `Seu gasto calórico diário estimado é de ${tdee.toFixed(0)} kcal. Use esse valor como base para definir sua meta (ex: emagrecimento, manutenção ou ganho de massa).`;
    }

    static interpretMacronutrients(macros: { proteinas: number, carboidratos: number, gorduras: number }) {
        return {
            ...macros,
            mensagem: "Distribuição sugerida com base em 30% proteínas, 50% carboidratos e 20% gorduras."
        };
    }

    static interpretTMB(tmb: number): string {
        return `Sua Taxa Metabólica Basal estimada é de ${tmb.toFixed(0)} kcal. Essa é a energia mínima necessária para manter funções vitais em repouso.`;
    }

    static interpretWaterIntake(waterMl: number): string {
        const litros = (waterMl / 1000).toFixed(2);
        return `Você deve consumir aproximadamente ${litros} litros de água por dia com base no seu peso corporal.`;
    }

    // IMC
    static calculateIMC(peso: number, alturaM: number): number {
        return peso / (alturaM * alturaM);
    }

    // TDEE (altura em metros; fórmula usa *100 internamente)
    static calculateTDEE(peso: number, alturaM: number, idade: number, sexo: string, nivelAtividade: NivelAtividade): number {
        const tmb = sexo === "M"
            ? 66.5 + 13.75 * peso + 5.003 * (alturaM * 100) - 6.75 * idade
            : 655 + 9.563 * peso + 1.850 * (alturaM * 100) - 4.676 * idade;

        const multiplicadores: Record<NivelAtividade, number> = {
            [NivelAtividade.SEDENTARIO]: 1.2,
            [NivelAtividade.LEVEMENTE_ATIVO]: 1.375,
            [NivelAtividade.MODERADAMENTE_ATIVO]: 1.55,
            [NivelAtividade.ALTAMENTE_ATIVO]: 1.725,
            [NivelAtividade.ATLETA]: 1.9,
        };

        return tmb * (multiplicadores[nivelAtividade] || 1.2);
    }

    static calculateMacronutrients(tdee: number) {
        return {
            proteinas: (tdee * 0.3) / 4,
            carboidratos: (tdee * 0.5) / 4,
            gorduras: (tdee * 0.2) / 9,
        };
    }

    static validateTMBData(metrics: UserMetrics) {
        if (!metrics.peso || !metrics.altura || !metrics.idade || !metrics.sexo) {
            throw new Error("Dados insuficientes para calcular a TMB.");
        }
    }

    static calculateTMB(peso: number, alturaM: number, idade: number, sexo: string): number {
        if (sexo === "M") {
            return 66 + (13.7 * peso) + (5 * (alturaM * 100)) - (6.8 * idade);
        } else {
            return 655 + (9.6 * peso) + (1.8 * (alturaM * 100)) - (4.7 * idade);
        }
    }

    static validateWaterData(metrics: UserMetrics) {
        if (!metrics.peso) throw new Error("Peso é necessário para calcular o consumo de água.");
    }

    static calculateDailyWater(peso: number): number {
        return peso * 45; // ml por dia
    }
}

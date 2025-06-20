import { AppDataSource } from "../config/ormconfig";
import { UserMetrics } from "../models/UserMetrics";
import { User } from "../models/User";
import { NivelAtividade } from "../models/enums/NivelAtividade";

const userMetricsRepository = AppDataSource.getRepository(UserMetrics);

export class UserMetricsService {
    static async createUserMetrics(
        userId: number,
        peso: number,
        altura: number,
        idade: number,
        sexo: string,
        nivelAtividade: NivelAtividade,
        gorduraCorporal?: number
    ) {
        const user = await AppDataSource.getRepository(User).findOne({
            where: { id: userId },
        });

        if (!user) throw new Error("Usuário não encontrado");

        // Buscar a última entrada do usuário
        const lastMetrics = await userMetricsRepository.findOne({
            where: { user: { id: userId } },
            order: { createdAt: "DESC" },
        });

        const parsedPeso = parseFloat(String(peso).replace(",", "."));
        const parsedAltura = parseFloat(String(altura).replace(",", "."));
        let parsedGordura: number | undefined = undefined;

        if (gorduraCorporal !== undefined && gorduraCorporal !== null) {
            const strValue = String(gorduraCorporal).replace(",", ".");
            const numValue = parseFloat(strValue);
            if (!isNaN(numValue)) parsedGordura = numValue;
        }

        // Se o usuário não alterar altura, idade, etc., manter os valores antigos
        const newMetrics = userMetricsRepository.create({
            user,
            peso: parsedPeso || lastMetrics?.peso,
            altura: parsedAltura || lastMetrics?.altura,
            idade: idade || lastMetrics?.idade,
            sexo: sexo || lastMetrics?.sexo,
            nivelAtividade: nivelAtividade || lastMetrics?.nivelAtividade,
            gorduraCorporal: parsedGordura ?? lastMetrics?.gorduraCorporal,
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
        this.validateTDEEData(metrics); // Depende do TDEE
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

    // Multiplicador de acordo com o nível de atividade
    private static getActivityMultiplier(nivelAtividade: NivelAtividade): number {
        const multiplicadores: Record<NivelAtividade, number> = {
            [NivelAtividade.SEDENTARIO]: 1.2,
            [NivelAtividade.LEVEMENTE_ATIVO]: 1.375,
            [NivelAtividade.MODERADAMENTE_ATIVO]: 1.55,
            [NivelAtividade.ALTAMENTE_ATIVO]: 1.725,
            [NivelAtividade.ATLETA]: 1.9,
        };
        return multiplicadores[nivelAtividade] || 1.2;
    }

    // Cálculo do IMC
    static calculateIMC(peso: number, altura: number): number {
        return peso / (altura * altura);
    }

    // Cálculo do Gasto Energético Diário (TDEE)
    static calculateTDEE(peso: number, altura: number, idade: number, sexo: string, nivelAtividade: NivelAtividade): number {
        let tmb = sexo === "M"
            ? 66.5 + 13.75 * peso + 5.003 * altura * 100 - 6.75 * idade
            : 655 + 9.563 * peso + 1.850 * altura * 100 - 4.676 * idade;

        const multiplicadores: Record<NivelAtividade, number> = {
            [NivelAtividade.SEDENTARIO]: 1.2,
            [NivelAtividade.LEVEMENTE_ATIVO]: 1.375,
            [NivelAtividade.MODERADAMENTE_ATIVO]: 1.55,
            [NivelAtividade.ALTAMENTE_ATIVO]: 1.725,
            [NivelAtividade.ATLETA]: 1.9,
        };

        return tmb * (multiplicadores[nivelAtividade] || 1.2);
    }

    // Cálculo da distribuição de Macronutrientes
    static calculateMacronutrients(tdee: number) {
        return {
            proteinas: (tdee * 0.3) / 4, // 30% de proteínas
            carboidratos: (tdee * 0.5) / 4, // 50% de carboidratos
            gorduras: (tdee * 0.2) / 9, // 20% de gorduras
        };
    }


    static validateTMBData(metrics: UserMetrics) {
        if (!metrics.peso || !metrics.altura || !metrics.idade || !metrics.sexo) {
            throw new Error("Dados insuficientes para calcular a TMB.");
        }
    }

    static calculateTMB(peso: number, altura: number, idade: number, sexo: string): number {
        if (sexo === "M") {
            return 66 + (13.7 * peso) + (5 * altura * 100) - (6.8 * idade);
        } else {
            return 655 + (9.6 * peso) + (1.8 * altura * 100) - (4.7 * idade);
        }
    }

    static validateWaterData(metrics: UserMetrics) {
        if (!metrics.peso) throw new Error("Peso é necessário para calcular o consumo de água.");
    }

    static calculateDailyWater(peso: number): number {
        return peso * 45; // ml por dia
    }
}

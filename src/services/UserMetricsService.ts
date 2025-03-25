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

        // Se o usuário não alterar altura, idade, etc., manter os valores antigos
        const newMetrics = userMetricsRepository.create({
            user,
            peso: peso || lastMetrics?.peso,
            altura: altura || lastMetrics?.altura,
            idade: idade || lastMetrics?.idade,
            sexo: sexo || lastMetrics?.sexo,
            nivelAtividade: nivelAtividade || lastMetrics?.nivelAtividade,
            gorduraCorporal: gorduraCorporal || lastMetrics?.gorduraCorporal,
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
}

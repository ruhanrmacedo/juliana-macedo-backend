import { Request, Response } from "express";
import { UserMetricsService } from "../services/UserMetricsService";
import { NivelAtividade } from "../models/enums/NivelAtividade";

export class UserMetricsController {
  // Criar/Atualizar métricas do usuário
  static async createOrUpdateUserMetrics(req: Request, res: Response) {
    try {
      const { peso, altura, idade, sexo, nivelAtividade, gorduraCorporal, userId: targetUserId } = req.body;
      const userId = req.user?.role === 'admin' && targetUserId ? targetUserId : req.user?.id;

      if (!userId) {
        res.status(400).json({ error: "Usuário não encontrado!" });
        return;
      }

      // Chama o serviço para criar ou atualizar as métricas
      const metrics = await UserMetricsService.createUserMetrics(
        userId,
        peso,
        altura,
        idade,
        sexo,
        nivelAtividade as NivelAtividade,
        gorduraCorporal
      );

      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Obter histórico de métricas do usuário
  static async getUserMetrics(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(400).json({ error: "Usuário não encontrado!" })
        return;
      }

      const metrics = await UserMetricsService.getUserMetrics(userId);
      res.json(metrics);
      return;
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  //  Calculo do IMC
  static async getIMC(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(404).json({ error: "Usuário não encontrado" });
        return;
      }
      const [last] = await UserMetricsService.getUserMetrics(userId);
      if (!last) {
        res.status(404).json({ error: "Nenhuma métrica encontrada" });
        return;
      }

      UserMetricsService.validateIMCData(last);
      const imc = UserMetricsService.calculateIMC(last.peso, last.altura);
      res.json({ imc: imc.toFixed(2) });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }


  static async getTDEE(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(404).json({ error: "Usuário não encontrado" });
        return;
      }
      const [last] = await UserMetricsService.getUserMetrics(userId);
      if (!last) {
        res.status(404).json({ error: "Nenhuma métrica encontrada" });
        return;
      }

      UserMetricsService.validateTDEEData(last);
      const tdee = UserMetricsService.calculateTDEE(last.peso, last.altura, last.idade, last.sexo, last.nivelAtividade);
      res.json({ tdee: tdee.toFixed(2) });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }


  static async getMacronutrients(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(404).json({ error: "Usuário não encontrado" });
        return;
      }

      const [last] = await UserMetricsService.getUserMetrics(userId);
      if (!last) {
        res.status(404).json({ error: "Nenhuma métrica encontrada" });
        return;
      }

      UserMetricsService.validateMacronutrientsData(last);
      const tdee = UserMetricsService.calculateTDEE(last.peso, last.altura, last.idade, last.sexo, last.nivelAtividade);
      const macros = UserMetricsService.calculateMacronutrients(tdee);

      res.json({
        proteinas: `${macros.proteinas.toFixed(1)}g`,
        carboidratos: `${macros.carboidratos.toFixed(1)}g`,
        gorduras: `${macros.gorduras.toFixed(1)}g`,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

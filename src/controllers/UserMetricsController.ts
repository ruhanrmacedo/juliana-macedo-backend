import { Request, Response } from "express";
import { UserMetricsService } from "../services/UserMetricsService";
import { NivelAtividade } from "../models/enums/NivelAtividade";

export class UserMetricsController {
  // Criar/Atualizar métricas do usuário
  static async createOrUpdateUserMetrics(req: Request, res: Response) {
    try {
      const { peso, altura, idade, sexo, nivelAtividade, gorduraCorporal } = req.body;
      const userId = req.user?.id; // ID do usuário autenticado

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
        nivelAtividade as NivelAtividade, // Convertendo para o tipo do enum
        gorduraCorporal
      );

      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Obter todas as métricas do usuário
  static async getUserMetrics(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(400).json({ error: "Usuário não encontrado!" })
        return;
      }

      // Obtém as métricas do usuário
      const metrics = await UserMetricsService.getUserMetrics(userId);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}

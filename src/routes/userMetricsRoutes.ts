import { Router } from "express";
import { UserMetricsController } from "../controllers/UserMetricsController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// Rota para criar/atualizar as métricas do usuário
router.post("/metrics", authMiddleware, UserMetricsController.createOrUpdateUserMetrics);

// Rota para obter as métricas do usuário
router.get("/metrics", authMiddleware, UserMetricsController.getUserMetrics);

export default router;

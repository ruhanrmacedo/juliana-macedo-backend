import { Router } from "express";
import { UserMetricsController } from "../controllers/UserMetricsController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// Rota para criar/atualizar as métricas do usuário
router.post("/metrics", authMiddleware, UserMetricsController.createOrUpdateUserMetrics);

// Rota para obter as métricas do usuário
router.get("/metrics", authMiddleware, UserMetricsController.getUserMetrics);

router.get("/metrics/imc", authMiddleware, UserMetricsController.getIMC);
router.get("/metrics/tdee", authMiddleware, UserMetricsController.getTDEE);
router.get("/metrics/macronutrients", authMiddleware, UserMetricsController.getMacronutrients);


export default router;

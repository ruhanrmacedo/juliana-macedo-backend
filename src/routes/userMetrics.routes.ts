import { Router } from "express";
import { UserMetricsController } from "../controllers/UserMetricsController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();


router.post("/", authMiddleware, UserMetricsController.createOrUpdateUserMetrics);
router.get("/", authMiddleware, UserMetricsController.getUserMetrics);
router.get("/imc", authMiddleware, UserMetricsController.getIMC);
router.get("/tdee", authMiddleware, UserMetricsController.getTDEE);
router.get("/macronutrients", authMiddleware, UserMetricsController.getMacronutrients);
router.get("/tmb", authMiddleware, UserMetricsController.getTMB);
router.get("/water", authMiddleware, UserMetricsController.getDailyWaterIntake);
router.get("/check", authMiddleware, UserMetricsController.checkIfHasMetrics);

export default router;

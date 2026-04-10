import { Router } from "express";
import { MealPlanController } from "../controllers/MealPlanController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.get("/", MealPlanController.listByPatient);
router.get("/:id", MealPlanController.getById);
router.post("/", authMiddleware, MealPlanController.create);
router.put("/:id", authMiddleware, MealPlanController.update);
router.patch("/:id/active", authMiddleware, MealPlanController.setActiveState);
router.delete("/:id", authMiddleware, MealPlanController.delete);

export default router;

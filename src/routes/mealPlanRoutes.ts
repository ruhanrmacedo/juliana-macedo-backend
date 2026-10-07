import { Router } from "express";
import { MealPlanController } from "../controllers/MealPlanController";
import { authMiddleware, checkRole } from "../middleware/authMiddleware";

const router = Router();

router.use(authMiddleware);

router.get("/", MealPlanController.listByPatient);
router.get("/:id", MealPlanController.getById);
router.post("/", checkRole(["admin"]), MealPlanController.create);
router.put("/:id", checkRole(["admin"]), MealPlanController.update);
router.patch("/:id/active", checkRole(["admin"]), MealPlanController.setActiveState);
router.delete("/:id", checkRole(["admin"]), MealPlanController.delete);

export default router;

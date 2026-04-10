import { Router } from "express";
import { FoodController } from "../controllers/FoodController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.get("/",          (req, res) => FoodController.listFoods(req as any, res));
router.get("/:id",       (req, res) => FoodController.getFoodById(req as any, res));
router.post("/",  authMiddleware, (req, res) => FoodController.createFood(req as any, res));
router.put("/:id", authMiddleware, (req, res) => FoodController.updateFood(req as any, res));
router.patch("/:id/active", authMiddleware, (req, res) => FoodController.setActiveState(req as any, res));

export default router;

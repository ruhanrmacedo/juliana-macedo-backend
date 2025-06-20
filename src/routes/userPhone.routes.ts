import { Router } from "express";
import { UserPhoneController } from "../controllers/UserPhoneController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post("/phones", authMiddleware, UserPhoneController.add);
router.get("/phones", authMiddleware, UserPhoneController.list);
router.delete("/phones/:id", authMiddleware, UserPhoneController.remove);
router.put("/phones/:id", authMiddleware, UserPhoneController.update);

export default router;
import { Router } from "express";
import { UserPhoneController } from "../controllers/UserPhoneController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post("/", authMiddleware, UserPhoneController.add);
router.get("/", authMiddleware, UserPhoneController.list);
router.delete("/:id", authMiddleware, UserPhoneController.remove);
router.put("/:id", authMiddleware, UserPhoneController.update);

export default router;
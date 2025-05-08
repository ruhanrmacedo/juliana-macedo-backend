import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { authMiddleware, checkRole } from "../middleware/authMiddleware";

const router = Router();

router.post("/register", UserController.register);
router.post("/login", UserController.login);

export default router;

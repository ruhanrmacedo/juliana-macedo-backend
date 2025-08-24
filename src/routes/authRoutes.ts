import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { authMiddleware, checkRole } from "../middleware/authMiddleware";


const router = Router();

router.post("/register", UserController.register);
router.post("/login", UserController.login);
router.post("/register/full", UserController.registerFull);
router.get("/me", authMiddleware, UserController.me);
router.put("/me", authMiddleware, UserController.updateProfile);
router.post("/recover-email", UserController.recoverEmail);
router.post("/forgot-password", UserController.forgotPassword);



export default router;

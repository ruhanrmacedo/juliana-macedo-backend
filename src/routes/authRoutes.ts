import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { authMiddleware } from "../middleware/authMiddleware";
import { PasswordResetController } from "../controllers/PasswordResetController";
import {
  forgotPasswordRateLimit,
  resetPasswordRateLimit,
} from "../middleware/passwordResetRateLimit";


const router = Router();

router.post("/register", UserController.register);
router.post("/login", UserController.login);
router.post("/register/full", UserController.registerFull);
router.get("/me", authMiddleware, UserController.me);
router.put("/me", authMiddleware, UserController.updateProfile);
router.post("/recover-email", UserController.recoverEmail);
router.post(
  "/forgot-password",
  forgotPasswordRateLimit,
  PasswordResetController.forgotPassword
);
router.post(
  "/reset-password",
  resetPasswordRateLimit,
  PasswordResetController.resetPassword
);
router.post("/change-password", authMiddleware, UserController.changePassword);



export default router;

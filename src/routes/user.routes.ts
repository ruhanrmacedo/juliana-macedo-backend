import { Router } from "express";
import { authMiddleware, checkRole } from "../middleware/authMiddleware";
import { UserController } from "../controllers/UserController";

const router = Router();

// Listar pacientes/usuários (ajuste os perfis permitidos aqui)
router.get("/", authMiddleware, checkRole(["admin"]), UserController.listUsers);

// Buscar 1 usuário por id (para o PatientLayout)
router.get("/:id", authMiddleware, checkRole(["admin"]), UserController.getUserById);

export default router;

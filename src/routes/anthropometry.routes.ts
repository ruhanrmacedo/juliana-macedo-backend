import { Router } from "express";
import { authMiddleware, checkRole } from "../middleware/authMiddleware";
import { AnthropometryController } from "../controllers/AnthropometryController";


const router = Router();

// Todas exigem login
router.use(authMiddleware);

// Criar/atualizar coleta (o próprio usuário ou admin)
router.post("/evaluations", AnthropometryController.createEvaluation);
router.patch("/evaluations/:id", AnthropometryController.updateEvaluation);

// Calcular (autopick e método específico)
router.post("/evaluations/:id/compute", AnthropometryController.computeWithAutopick);
router.post("/evaluations/:id/compute/:method", AnthropometryController.computeWithMethod);

// Consultas
router.get("/evaluations/:id", AnthropometryController.getEvaluation);
router.get("/users/:userId/evaluations", AnthropometryController.listByUser);
router.get("/users/:userId/latest", AnthropometryController.getLatestByUser);

// Exemplo de rota restrita só para admin/nutri (se quiser):
// router.get("/admin/some-report", checkRole(["admin"]), AnthropometryController.someReport);

export default router;

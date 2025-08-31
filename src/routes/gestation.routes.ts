import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { GestationController } from "../controllers/GestationController";

const router = Router();
router.use(authMiddleware);

// Iniciar acompanhamento
router.post("/start", GestationController.start);

// Buscar acompanhamento atual do usuário
router.get("/users/:userId/current", GestationController.getCurrent);

// Visitas
router.post("/:trackingId/visits", GestationController.addVisit);
router.get("/:trackingId/visits", GestationController.listVisits);

export default router;

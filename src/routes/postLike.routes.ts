import { Router } from "express";
import { PostLikeController } from "../controllers/PostLikeController";

const router = Router();

// Like em um post (qualquer visitante pode)
router.post("/", PostLikeController.like);

// Contar likes de um post
router.get("/:postId", PostLikeController.count);

export default router;
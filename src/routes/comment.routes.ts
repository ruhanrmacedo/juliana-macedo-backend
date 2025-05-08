import { Router } from "express";
import { CommentController } from "../controllers/CommentController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// Criar comentário (autenticado)
router.post("/", authMiddleware, CommentController.create);

// Atualizar comentário (apenas autor)
router.put("/:commentId", authMiddleware, CommentController.update);

// Deletar comentário (autor ou admin)
router.delete("/:commentId", authMiddleware, CommentController.delete);

// Listar comentários de um post (público)
router.get("/post/:postId", CommentController.listByPost);

export default router;
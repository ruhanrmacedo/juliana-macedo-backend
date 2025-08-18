import { Router } from "express";
import { CommentController } from "../controllers/CommentController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.post("/", authMiddleware, CommentController.create);
router.put("/:commentId", authMiddleware, CommentController.update);
router.delete("/:commentId", authMiddleware, CommentController.delete);
router.get("/post/:postId", CommentController.listByPost);
router.get("/post/:postId/paginated", CommentController.listByPostPaginated);

export default router;
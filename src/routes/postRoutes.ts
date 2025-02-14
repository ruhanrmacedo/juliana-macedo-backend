import { Router } from "express";
import { PostController } from "../controllers/PostController";
import { authMiddleware } from "../middleware/authMiddleware";
import { checkRole } from "../middleware/authMiddleware";

const router = Router();

router.post("/posts", authMiddleware, PostController.createPost);
router.get("/posts", PostController.getAllPosts);
router.get("/posts/:id", PostController.getPostById);
router.put("/posts/:id", authMiddleware, PostController.updatePost);
router.patch("/posts/:id/toggle-active", authMiddleware, PostController.toggleActive);
router.delete("/posts/:id", authMiddleware, checkRole(["admin"]), PostController.deletePost);
router.get("/posts/filter", PostController.filterPosts);

export default router;

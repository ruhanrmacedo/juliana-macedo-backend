import { Router } from "express";
import { PostController } from "../controllers/PostController";
import { authMiddleware } from "../middleware/authMiddleware";
import { checkRole } from "../middleware/authMiddleware";
import { upload } from "../middleware/upload";

const router = Router();

// 🔹 Rotas específicas sempre primeiro
router.get("/postspaginated", PostController.getPaginated);
router.get("/top", PostController.getTopViewed);
router.get("/filter", PostController.filterPosts);

// 🔹 CRUD de posts
router.post("/", authMiddleware, upload.single("image"), PostController.createPost);
router.get("/", PostController.getAllPosts);
router.get("/:id", PostController.getPostById);
router.put("/:id", authMiddleware, upload.single("image"), PostController.updatePost);
router.patch("/:id/toggle", authMiddleware, PostController.toggleActive);
router.delete("/:id", authMiddleware, PostController.deletePost);

export default router;

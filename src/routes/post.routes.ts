import { Router } from "express";
import { PostController } from "../controllers/PostController";
import { authMiddleware, checkRole } from "../middleware/authMiddleware";
import { upload } from "../middleware/upload";

const router = Router();

router.get("/postspaginated", PostController.getPaginated);
router.get("/top", PostController.getTopViewed);
router.get("/filter", PostController.filterPosts);
router.get("/admin", authMiddleware, checkRole(["admin"]), PostController.getAdminPosts);

router.post(
  "/",
  authMiddleware,
  checkRole(["admin"]),
  upload.single("image"),
  PostController.createPost
);
router.get("/", PostController.getAllPosts);
router.get("/:id", PostController.getPostById);
router.put(
  "/:id",
  authMiddleware,
  checkRole(["admin"]),
  upload.single("image"),
  PostController.updatePost
);
router.patch(
  "/:id/toggle",
  authMiddleware,
  checkRole(["admin"]),
  PostController.toggleActive
);
router.delete(
  "/:id",
  authMiddleware,
  checkRole(["admin"]),
  PostController.deletePost
);

export default router;

import { Router } from "express";
import { MediaController } from "../controllers/MediaController";
import { uploadSingleImage } from "../middleware/upload";
import { authMiddleware, checkRole } from "../middleware/authMiddleware";
import { mediaUploadRateLimit } from "../middleware/mediaUploadRateLimit";

const router = Router();

router.post(
  "/image",
  authMiddleware,
  checkRole(["admin"]),
  mediaUploadRateLimit,
  uploadSingleImage,
  MediaController.uploadImage
);

export default router;

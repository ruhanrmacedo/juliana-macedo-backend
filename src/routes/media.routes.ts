import { Router } from "express";
import { MediaController } from "../controllers/MediaController";
import { upload } from "../middleware/upload";
// opcional: proteger -> import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// Se quiser exigir login, adicione `authMiddleware` antes do upload
router.post("/image", upload.single("image"), MediaController.uploadImage);

export default router;

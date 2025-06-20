import { Router } from "express";
import { UserEmailController } from "../controllers/UserEmailController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.use(authMiddleware);
router.post("/", UserEmailController.add);
router.get("/", UserEmailController.list);
router.delete("/:id", UserEmailController.remove);
router.put("/:id", UserEmailController.update);

export default router;

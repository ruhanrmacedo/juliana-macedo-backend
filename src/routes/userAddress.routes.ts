import { Router } from "express";
import { UserAddressController } from "../controllers/UserAddressController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.use(authMiddleware);

router.post("/", UserAddressController.add);
router.get("/", UserAddressController.list);
router.delete("/:id", UserAddressController.remove);
router.put("/:id", UserAddressController.update);

export default router;

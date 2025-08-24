import { Router } from "express";
import { authMiddleware, checkRole } from "../middleware/authMiddleware";
import { AdminUserController } from "../controllers/AdminUserController";

const router = Router();
router.use(authMiddleware, checkRole(["admin"]));

router.put("/:id", AdminUserController.updateUser);
router.put("/:id/password", AdminUserController.setPassword);

// phones
router.get("/:id/phones", AdminUserController.listPhones);
router.post("/:id/phones", AdminUserController.addPhone);
router.put("/:id/phones/:phoneId", AdminUserController.updatePhone);
router.delete("/:id/phones/:phoneId", AdminUserController.removePhone);

// emails
router.get("/:id/emails", AdminUserController.listEmails);
router.post("/:id/emails", AdminUserController.addEmail);
router.put("/:id/emails/:emailId", AdminUserController.updateEmail);
router.delete("/:id/emails/:emailId", AdminUserController.removeEmail);

// addresses
router.get("/:id/addresses", AdminUserController.listAddresses);
router.post("/:id/addresses", AdminUserController.addAddress);
router.put("/:id/addresses/:addressId", AdminUserController.updateAddress);
router.delete("/:id/addresses/:addressId", AdminUserController.removeAddress);

export default router;
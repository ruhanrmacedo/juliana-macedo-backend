import { Router, ErrorRequestHandler } from "express";
import { ProfessionalController as controller } from "../controllers/ProfessionalController";
import { authMiddleware, checkRole } from "../middleware/authMiddleware";
import { professionalAdminAccess } from "../middleware/professionalAccess";
import { professionalErrorResponse } from "../services/professional/ProfessionalErrors";

const router = Router();
router.use((_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
router.use(authMiddleware, checkRole(["admin"]), professionalAdminAccess);
router.get("/profile", controller.adminProfile);
router.patch("/profile", controller.patchProfile);
router.get("/services", controller.adminServices);
router.post("/services", controller.createService);
router.get("/services/:id", controller.adminService);
router.patch("/services/:id", controller.patchService);
router.get("/faqs", controller.adminFaqs);
router.post("/faqs", controller.createFaq);
router.get("/faqs/:id", controller.adminFaq);
router.patch("/faqs/:id", controller.patchFaq);
const errors: ErrorRequestHandler = (error, _req, res, _next) => {
  professionalErrorResponse(res, error);
};
router.use(errors);
export default router;

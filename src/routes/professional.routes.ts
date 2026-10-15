import { Router } from "express";
import { ProfessionalController as controller } from "../controllers/ProfessionalController";

const router = Router();
router.get("/profile", controller.publicProfile);
router.get("/services", controller.publicServices);
router.get("/faqs", controller.publicFaqs);
export default router;

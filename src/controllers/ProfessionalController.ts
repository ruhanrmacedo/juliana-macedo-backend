import { Request, RequestHandler } from "express";
import { BadRequest } from "../models/anthropometry/calculators/utils/errors";
import { ProfessionalApiService } from "../services/professional/ProfessionalService";
import { professionalErrorResponse } from "../services/professional/ProfessionalErrors";

const service = new ProfessionalApiService();

function id(req: Request): number {
  const raw = req.params.id;
  const value = Number(raw);
  if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(value)) {
    throw new BadRequest("Identificador inválido.");
  }
  return value;
}

function endpoint(action: (req: Request) => Promise<unknown>, status = 200): RequestHandler {
  return async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    try {
      res.status(status).json({ data: await action(req) });
    } catch (error) {
      professionalErrorResponse(res, error);
    }
  };
}

export const ProfessionalController = {
  publicProfile: endpoint(() => service.publicProfile()),
  publicServices: endpoint(() => service.publicServices()),
  publicFaqs: endpoint(() => service.publicFaqs()),
  adminProfile: endpoint((req) => service.adminProfile(req.user)),
  patchProfile: endpoint((req) => service.patchProfile(req.body, req.user)),
  adminServices: endpoint((req) => service.adminServices(req.user)),
  adminService: endpoint((req) => service.adminService(id(req), req.user)),
  createService: endpoint((req) => service.createService(req.body, req.user), 201),
  patchService: endpoint((req) => service.patchService(id(req), req.body, req.user)),
  adminFaqs: endpoint((req) => service.adminFaqs(req.user)),
  adminFaq: endpoint((req) => service.adminFaq(id(req), req.user)),
  createFaq: endpoint((req) => service.createFaq(req.body, req.user), 201),
  patchFaq: endpoint((req) => service.patchFaq(id(req), req.body, req.user)),
};

import { RequestHandler } from "express";
import {
  assertProfessionalAccountMutation, assertProfessionalAdmin,
} from "../services/professional/ProfessionalPolicies";

export const professionalAdminAccess: RequestHandler = (req, _res, next) => {
  try {
    assertProfessionalAdmin(req.user);
    next();
  } catch (error) {
    next(error);
  }
};

export const professionalAccountMutationAccess: RequestHandler = (req, _res, next) => {
  try {
    assertProfessionalAccountMutation(Number(req.params.id), req.user);
    next();
  } catch (error) {
    next(error);
  }
};

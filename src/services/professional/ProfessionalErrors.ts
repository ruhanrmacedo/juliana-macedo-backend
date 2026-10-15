import { Response } from "express";
import { QueryFailedError } from "typeorm";
import {
  BadRequest, Forbidden, NotFound, Unauthorized,
} from "../../models/anthropometry/calculators/utils/errors";

export class ProfessionalConflict extends Error {
  readonly status = 409;
}

export class ProfessionalUnavailable extends Error {
  readonly status = 503;
}

export function professionalErrorResponse(res: Response, error: unknown) {
  if (
    error instanceof BadRequest || error instanceof Forbidden ||
    error instanceof NotFound || error instanceof Unauthorized ||
    error instanceof ProfessionalConflict || error instanceof ProfessionalUnavailable
  ) {
    return res.status(error.status).json({ error: error.message });
  }
  if (error instanceof QueryFailedError) {
    const code = (error.driverError as { code?: string }).code;
    if (code === "23505") {
      return res.status(409).json({ error: "Código ou slug já utilizado." });
    }
    if (["23514", "23502", "22001", "22003"].includes(code ?? "")) {
      return res.status(400).json({ error: "Dados profissionais inválidos." });
    }
  }
  return res.status(500).json({ error: "Erro interno do servidor." });
}

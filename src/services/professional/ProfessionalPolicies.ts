import {
  Forbidden, Unauthorized,
} from "../../models/anthropometry/calculators/utils/errors";
import { ProfessionalUnavailable } from "./ProfessionalErrors";

export type ProfessionalActor = { id: number; role: string };

// Deliberately lazy: missing configuration never prevents server startup.
export function professionalAdminUserId(): number | undefined {
  const raw = process.env.PROFESSIONAL_ADMIN_USER_ID;
  if (!raw || !/^[1-9]\d*$/.test(raw)) return undefined;
  const id = Number(raw);
  return Number.isSafeInteger(id) ? id : undefined;
}

export function assertProfessionalAdmin(
  actor?: ProfessionalActor
): asserts actor is ProfessionalActor {
  if (!actor) throw new Unauthorized("Autenticação obrigatória.");
  if (actor.role !== "admin") throw new Forbidden("Acesso negado.");
  const authorizedId = professionalAdminUserId();
  if (authorizedId === undefined) {
    throw new ProfessionalUnavailable("Administração profissional indisponível.");
  }
  if (actor.id !== authorizedId) throw new Forbidden("Acesso negado.");
}

export function assertProfessionalAccountMutation(
  targetId: number,
  actor?: ProfessionalActor
): void {
  const protectedId = professionalAdminUserId();
  // An unknown account must not change the behavior of unrelated user APIs.
  if (protectedId === undefined || targetId !== protectedId) return;
  if (actor?.id !== protectedId || actor.role !== "admin") {
    throw new Forbidden("Alteração da conta profissional não autorizada.");
  }
}

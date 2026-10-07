import {
    Forbidden,
    Unauthorized,
} from "../../models/anthropometry/calculators/utils/errors";
import type { RequesterContext } from "../../types/types";

// A role profissional será introduzida apenas na fase de domínio apropriada.
// No modelo atual, somente ADMIN possui autoridade clínica.
export const isStaff = (role?: string) => role === "admin";

export function assertAuthenticated(
    requester?: RequesterContext
): asserts requester is RequesterContext {
    if (!requester) throw new Unauthorized("Autenticação obrigatória.");
}

export function assertCanAccessPatient(
    patientId: number,
    requester?: RequesterContext
): void {
    assertAuthenticated(requester);
    if (isStaff(requester.role)) return;
    if (requester.id !== patientId) throw new Forbidden("Sem permissão para acessar planos alimentares de outro usuário.");
}

export function assertCanManageMealPlans(
    requester?: RequesterContext
): asserts requester is RequesterContext {
    assertAuthenticated(requester);
    if (!isStaff(requester.role)) {
        throw new Forbidden("Somente administradores podem gerenciar prescrições alimentares.");
    }
}

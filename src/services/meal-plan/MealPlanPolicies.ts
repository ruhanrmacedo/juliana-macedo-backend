import { Forbidden } from "../../models/anthropometry/calculators/utils/errors";
import type { RequesterContext } from "../../types/types";

export const isStaff = (role?: string) => role === "admin" || role === "professional";

export const assertCanAccessPatient = (patientId: number, requester?: RequesterContext) => {
    if (!requester) return;
    if (isStaff(requester.role)) return;
    if (requester.id !== patientId) throw new Forbidden("Sem permissão para acessar planos alimentares de outro usuário.");
};

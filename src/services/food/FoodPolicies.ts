import { Forbidden } from "../../models/anthropometry/calculators/utils/errors";

export const isStaff = (role?: string) => (role ?? "").toUpperCase() === "ADMIN";

export type RequesterContext = { id: number; role: string };

export const assertCanManageFood = (requester?: RequesterContext, ownerId?: number | null) => {
    if (!requester) return;
    if (isStaff(requester.role)) return;
    if (ownerId == null) throw new Forbidden("Somente administradores podem gerenciar alimentos globais.");
    if (ownerId !== requester.id) throw new Forbidden("Sem permissão para gerenciar alimentos de outro usuário.");
};

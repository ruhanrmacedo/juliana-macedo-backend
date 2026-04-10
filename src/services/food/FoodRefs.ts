import { In } from "typeorm";
import { AppDataSource } from "../../config/ormconfig";
import { BadRequest } from "../../models/anthropometry/calculators/utils/errors";
import { Nutrient } from "../../models/food/Nutrient";
import { SourceDocument } from "../../models/food/SourceDocument";
import { User } from "../../models/User";
import { assertCanManageFood, RequesterContext } from "./FoodPolicies";

export const resolveOwner = async (ownerId: number | null | undefined, requester?: RequesterContext, manager = AppDataSource.manager) => {
    if (ownerId == null) return null;
    assertCanManageFood(requester, ownerId);
    const owner = await manager.getRepository(User).findOne({ where: { id: ownerId } });
    if (!owner) throw new BadRequest("Usuário proprietário não encontrado.");
    return owner;
};

export const loadReferenceMaps = async (variants: Array<{ nutrients?: Array<{ nutrientId: number; sourceDocumentId?: number | null }> }> | undefined, manager = AppDataSource.manager) => {
    const nutrientIds = new Set<number>();
    const sourceDocIds = new Set<number>();

    for (const v of variants ?? []) for (const n of v.nutrients ?? []) {
        nutrientIds.add(n.nutrientId);
        if (n.sourceDocumentId) sourceDocIds.add(n.sourceDocumentId);
    }

    const nutrientMap = new Map<number, Nutrient>();
    const sourceDocMap = new Map<number, SourceDocument>();

    if (nutrientIds.size) {
        const found = await manager.getRepository(Nutrient).findBy({ id: In([...nutrientIds]) });
        found.forEach(n => nutrientMap.set(n.id, n));
        nutrientIds.forEach(id => { if (!nutrientMap.has(id)) throw new BadRequest(`Nutriente ${id} não encontrado.`); });
    }

    if (sourceDocIds.size) {
        const found = await manager.getRepository(SourceDocument).findBy({ id: In([...sourceDocIds]) });
        found.forEach(s => sourceDocMap.set(s.id, s));
        sourceDocIds.forEach(id => { if (!sourceDocMap.has(id)) throw new BadRequest(`Documento fonte ${id} não encontrado.`); });
    }

    return { nutrientMap, sourceDocMap };
};

import { EntityManager, In } from "typeorm";
import { BadRequest } from "../../models/anthropometry/calculators/utils/errors";
import { FoodVariant } from "../../models/food/FoodVariant";
import { HouseholdMeasure } from "../../models/food/HouseholdMeasure";

export type ReferenceMaps = {
    variants: Map<number, FoodVariant>;
    measures: Map<number, HouseholdMeasure>;
};

export const collectReferences = (days?: any[], meals?: any[]) => {
    const variantIds = new Set<number>();
    const measureIds = new Set<number>();

    const toPositiveInt = (v: any) => {
        const n = typeof v === "string" ? Number(v) : v;
        if (!Number.isInteger(n) || n <= 0) throw new BadRequest("ID inválido.");
        return n;
    };

    const processMeals = (list?: any[]) => {
        for (const meal of list ?? []) {
            for (const item of meal.items ?? []) {
                variantIds.add(toPositiveInt(item.foodVariantId));
                if (item.measureId !== undefined && item.measureId !== null && item.measureId !== "")
                    measureIds.add(toPositiveInt(item.measureId));
            }
        }
    };

    for (const d of days ?? []) processMeals(d.meals);
    processMeals(meals);

    return { variantIds, measureIds };
};

export const loadReferenceMaps = async (
    manager: EntityManager,
    variantIds: Set<number>,
    measureIds: Set<number>
): Promise<ReferenceMaps> => {
    const variants = new Map<number, FoodVariant>();
    const measures = new Map<number, HouseholdMeasure>();

    if (variantIds.size) {
        const found = await manager.getRepository(FoodVariant).findBy({ id: In([...variantIds]) });
        found.forEach(v => variants.set(v.id, v));
        variantIds.forEach(id => { if (!variants.has(id)) throw new BadRequest("Variação de alimento " + id + " não encontrada."); });
    }

    if (measureIds.size) {
        const found = await manager.getRepository(HouseholdMeasure).find({
            where: { id: In([...measureIds]) },
            relations: { foodVariant: true },
        });
        found.forEach(m => measures.set(m.id, m));
        measureIds.forEach(id => { if (!measures.has(id)) throw new BadRequest("Medida caseira " + id + " não encontrada."); });
    }

    return { variants, measures };
};

export const ensureMeasureMatchesVariant = (measure: HouseholdMeasure | undefined, variant: FoodVariant) => {
    if (!measure) return;
    if (!measure.foodVariant || measure.foodVariant.id !== variant.id) {
        throw new BadRequest(`A medida caseira ${measure.id} não pertence à variação de alimento ${variant.id}.`);
    }
};

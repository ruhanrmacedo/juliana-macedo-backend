import { AppDataSource } from "../../config/ormconfig";
import { Food } from "../../models/food/Food";
import { FoodAlias } from "../../models/food/FoodAlias";
import { FoodNutrient } from "../../models/food/FoodNutrient";
import { FoodVariant } from "../../models/food/FoodVariant";
import { HouseholdMeasure } from "../../models/food/HouseholdMeasure";
import { BadRequest, Forbidden, NotFound } from "../../models/anthropometry/calculators/utils/errors";
import { FoodReader } from "./FoodReader";
import { ensureSingleDefault, assertValidId } from "./FoodValidators";
import { toDecimalString } from "./FoodMappers";
import { resolveOwner, loadReferenceMaps } from "./FoodRefs";
import { assertCanManageFood, isStaff, RequesterContext } from "./FoodPolicies";
import { FoodSourceType } from "../../models/enums/FoodSourceType";
import { FoodTexture } from "../../models/enums/FoodTexture";
import { UnitBase } from "../../models/enums/UnitBase";
import type { CreateFoodInput, UpdateFoodInput } from "../../types/types";
import { DeepPartial } from "typeorm";

// helpers locais para padronizar nulos/strings/decimais
const strOrNull = (v?: string | null) => (v && v.trim() ? v.trim() : null);
const toDecimalNullable = (v: number | string | null | undefined) =>
    v === null ? null : (toDecimalString(v) ?? null);

export const FoodWriter = {
    async createFood(input: CreateFoodInput, requester?: RequesterContext) {
        if (!input.name?.trim()) throw new BadRequest("Nome do alimento é obrigatório.");
        if (!input.variants?.length) throw new BadRequest("Informe ao menos uma variação para o alimento.");
        if ((input.ownerId == null) && requester && !isStaff(requester.role))
            throw new Forbidden("Somente administradores podem criar alimentos globais.");

        ensureSingleDefault(input.variants, "variação");
        input.variants.forEach((v, i) => {
            if (!v.description?.trim()) throw new BadRequest(`Descrição da variação #${i + 1} é obrigatória.`);
            if (v.measures) ensureSingleDefault(v.measures, "medida caseira");
        });

        const { nutrientMap, sourceDocMap } = await loadReferenceMaps(input.variants, AppDataSource.manager);

        const foodId = await AppDataSource.transaction(async (manager) => {
            const owner = await resolveOwner(input.ownerId ?? null, requester, manager);

            const foodRepo = manager.getRepository(Food);
            const food = foodRepo.create({
                name: input.name.trim(),
                scientificName: strOrNull(input.scientificName),
                category: strOrNull(input.category),
                textura: input.textura ?? FoodTexture.SOLIDO,
                unitBase: input.unitBase ?? UnitBase.GRAMA,
                densityGPerMl: toDecimalNullable(input.densityGPerMl),
                sourceType: input.sourceType ?? FoodSourceType.USER,
                owner: owner ?? undefined,
                isActive: input.isActive ?? true,
            });
            await foodRepo.save(food);

            if (input.aliases?.length) {
                const aliasRepo = manager.getRepository(FoodAlias);
                const aliases = input.aliases
                    .filter(a => a.alias.trim())
                    .map(a => aliasRepo.create({ food, alias: a.alias.trim(), locale: a.locale ?? "pt-BR" }));
                if (aliases.length) await aliasRepo.save(aliases);
            }

            const variantRepo = manager.getRepository(FoodVariant);
            const measureRepo = manager.getRepository(HouseholdMeasure);
            const nutrientRepo = manager.getRepository(FoodNutrient);

            let defaultVariantId: number | null = null;

            for (const vin of input.variants) {
                const variant = variantRepo.create({
                    food,
                    description: vin.description.trim(),
                    preparationMethod: vin.preparationMethod?.trim() ?? undefined,
                    moistureFactor: toDecimalNullable(vin.moistureFactor),
                    defaultPortionGml: toDecimalNullable(vin.defaultPortionGml),
                    isDefault: Boolean(vin.isDefault),
                } as DeepPartial<FoodVariant>);
                await variantRepo.save(variant);
                if (variant.isDefault) defaultVariantId = variant.id;

                if (vin.measures?.length) {
                    const measures = vin.measures.filter(m => m.name.trim()).map(m => measureRepo.create({
                        foodVariant: variant,
                        name: m.name.trim(),
                        quantity: toDecimalString(m.quantity) ?? "1",
                        grams: toDecimalString(m.grams),
                        milliliters: toDecimalString(m.milliliters),
                        isDefault: Boolean(m.isDefault),
                        notes: m.notes?.trim() ?? undefined,
                    }));
                    if (measures.length) await measureRepo.save(measures);
                }

                if (vin.nutrients?.length) {
                    const nutrients = vin.nutrients.map(nin => {
                        const nutrient = nutrientMap.get(nin.nutrientId);
                        if (!nutrient) throw new BadRequest(`Nutriente ${nin.nutrientId} não encontrado.`);
                        const sourceDocument = nin.sourceDocumentId ? sourceDocMap.get(nin.sourceDocumentId) : undefined;
                        return nutrientRepo.create({
                            foodVariant: variant,
                            nutrient,
                            sourceDocument,
                            valuePer100: toDecimalString(nin.valuePer100) ?? "0",
                            minValue: toDecimalString(nin.minValue),
                            maxValue: toDecimalString(nin.maxValue),
                            stdDeviation: toDecimalString(nin.stdDeviation),
                            method: nin.method?.trim() ?? undefined,
                            dataQuality: nin.dataQuality?.trim() ?? undefined,
                        });
                    });
                    if (nutrients.length) await nutrientRepo.save(nutrients);
                }
            }

            // garante único default
            if (defaultVariantId == null) {
                const first = await variantRepo.findOne({ where: { food: { id: food.id } }, order: { id: "ASC" } });
                if (first) { first.isDefault = true; await variantRepo.save(first); }
            } else {
                await variantRepo.createQueryBuilder()
                    .update().set({ isDefault: false })
                    .where("food_id = :foodId AND id != :variantId", { foodId: food.id, variantId: defaultVariantId })
                    .execute();
            }

            return food.id;
        });

        return FoodReader.getFoodById(foodId);
    },

    async updateFood(id: number, input: UpdateFoodInput, requester?: RequesterContext) {
        assertValidId(id, "ID do alimento");

        if (input.variants) {
            ensureSingleDefault(input.variants, "variação");
            input.variants.forEach((v, i) => {
                if (!v.description?.trim()) throw new BadRequest(`Descrição da variação #${i + 1} é obrigatória.`);
                if (v.measures) ensureSingleDefault(v.measures, "medida caseira");
            });
        }
        if (input.ownerId === null && requester && !isStaff(requester.role))
            throw new Forbidden("Somente administradores podem remover o vínculo de proprietário do alimento.");

        const { nutrientMap, sourceDocMap } = await loadReferenceMaps(input.variants, AppDataSource.manager);

        await AppDataSource.transaction(async (manager) => {
            const foodRepo = manager.getRepository(Food);
            const food = await foodRepo.findOne({ where: { id }, relations: { owner: true } });
            if (!food) throw new NotFound("Alimento não encontrado.");

            assertCanManageFood(requester, food.owner?.id ?? null);

            if (input.ownerId !== undefined) {
                const owner = await resolveOwner(input.ownerId, requester, manager);
                food.owner = owner ?? undefined;
            }

            if (input.name !== undefined) food.name = input.name?.trim() ?? food.name;
            if (input.scientificName !== undefined) food.scientificName = strOrNull(input.scientificName);
            if (input.category !== undefined) food.category = strOrNull(input.category);
            if (input.textura !== undefined) food.textura = input.textura;
            if (input.unitBase !== undefined) food.unitBase = input.unitBase;

            if (input.densityGPerMl !== undefined) food.densityGPerMl = toDecimalNullable(input.densityGPerMl);
            if (input.sourceType !== undefined) food.sourceType = input.sourceType;
            if (input.isActive !== undefined) food.isActive = input.isActive;

            await foodRepo.save(food);

            if (input.aliases) {
                const aliasRepo = manager.getRepository(FoodAlias);
                await aliasRepo.createQueryBuilder().delete().where("food_id = :foodId", { foodId: food.id }).execute();
                const aliases = input.aliases
                    .filter(a => a.alias.trim())
                    .map(a => aliasRepo.create({ food, alias: a.alias.trim(), locale: a.locale ?? "pt-BR" }));
                if (aliases.length) await aliasRepo.save(aliases);
            }

            if (input.variants) {
                const variantRepo = manager.getRepository(FoodVariant);
                const measureRepo = manager.getRepository(HouseholdMeasure);
                const nutrientRepo = manager.getRepository(FoodNutrient);

                const existing = await variantRepo.find({
                    where: { food: { id: food.id } },
                    relations: { measures: true, nutrients: true },
                });
                const existingMap = new Map(existing.map(v => [v.id, v]));

                let defaultVariantId: number | null = null;

                for (const vin of input.variants) {
                    let variant = vin.id ? existingMap.get(vin.id) : undefined;
                    if (vin.id && !variant) throw new BadRequest(`Variação ${vin.id} não encontrada neste alimento.`);
                    if (!variant) variant = variantRepo.create({ food } as DeepPartial<FoodVariant>);

                    variant.description = vin.description.trim();
                    variant.preparationMethod = vin.preparationMethod?.trim() ?? undefined;
                    variant.moistureFactor = toDecimalNullable(vin.moistureFactor);
                    variant.defaultPortionGml = toDecimalNullable(vin.defaultPortionGml);
                    variant.isDefault = Boolean(vin.isDefault);
                    await variantRepo.save(variant);
                    if (variant.isDefault) defaultVariantId = variant.id;

                    if (vin.measures) {
                        await measureRepo.createQueryBuilder().delete().where("food_variant_id = :id", { id: variant.id }).execute();
                        const measures = vin.measures.filter(m => m.name.trim()).map(m => measureRepo.create({
                            foodVariant: variant,
                            name: m.name.trim(),
                            quantity: toDecimalString(m.quantity) ?? "1",
                            grams: toDecimalString(m.grams),
                            milliliters: toDecimalString(m.milliliters),
                            isDefault: Boolean(m.isDefault),
                            notes: m.notes?.trim() ?? undefined,
                        }));
                        if (measures.length) await measureRepo.save(measures);
                    }

                    if (vin.nutrients) {
                        await nutrientRepo.createQueryBuilder().delete().where("food_variant_id = :id", { id: variant.id }).execute();
                        const nutrients = vin.nutrients.map(nin => {
                            const nutrient = nutrientMap.get(nin.nutrientId);
                            if (!nutrient) throw new BadRequest(`Nutriente ${nin.nutrientId} não encontrado.`);
                            const sourceDocument = nin.sourceDocumentId ? sourceDocMap.get(nin.sourceDocumentId) : undefined;
                            return nutrientRepo.create({
                                foodVariant: variant,
                                nutrient,
                                sourceDocument,
                                valuePer100: toDecimalString(nin.valuePer100) ?? "0",
                                minValue: toDecimalString(nin.minValue),
                                maxValue: toDecimalString(nin.maxValue),
                                stdDeviation: toDecimalString(nin.stdDeviation),
                                method: nin.method?.trim() ?? undefined,
                                dataQuality: nin.dataQuality?.trim() ?? undefined,
                            });
                        });
                        if (nutrients.length) await nutrientRepo.save(nutrients);
                    }
                }

                if (defaultVariantId != null) {
                    await variantRepo.createQueryBuilder()
                        .update().set({ isDefault: false })
                        .where("food_id = :foodId AND id != :variantId", { foodId: food.id, variantId: defaultVariantId })
                        .execute();
                } else {
                    const hasDefault = await variantRepo.count({ where: { food: { id: food.id }, isDefault: true } });
                    if (hasDefault === 0) {
                        const first = await variantRepo.findOne({ where: { food: { id: food.id } }, order: { id: "ASC" } });
                        if (first) { first.isDefault = true; await variantRepo.save(first); }
                    }
                }
            }
        });

        return FoodReader.getFoodById(id);
    },

    async setActiveState(id: number, isActive: boolean, requester?: RequesterContext) {
        assertValidId(id, "ID do alimento");
        const repo = AppDataSource.getRepository(Food);
        const food = await repo.findOne({ where: { id }, relations: { owner: true } });
        if (!food) throw new NotFound("Alimento não encontrado.");
        assertCanManageFood(requester, food.owner?.id ?? null);
        food.isActive = isActive;
        await repo.save(food);
        return FoodReader.getFoodById(id);
    },
};

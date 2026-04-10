import { AppDataSource } from "../../config/ormconfig";
import { Food } from "../../models/food/Food";
import { NotFound } from "../../models/anthropometry/calculators/utils/errors";
import { sortFoodAggregates } from "./FoodMappers";
import type { FoodListFilters } from "../../types/types";

const foodRepository = () => AppDataSource.getRepository(Food);

export const FoodReader = {
    async listFoods(filters: FoodListFilters = {}) {
        const repo = foodRepository();
        const qb = repo.createQueryBuilder("food");

        if (filters.includeOwner) qb.leftJoinAndSelect("food.owner", "owner");
        const joinVariants = Boolean(filters.includeVariants || filters.includeMeasures || filters.includeNutrients);
        if (joinVariants) qb.leftJoinAndSelect("food.variants", "variant");
        if (filters.includeMeasures) qb.leftJoinAndSelect("variant.measures", "measure");
        if (filters.includeNutrients) {
            qb.leftJoinAndSelect("variant.nutrients", "nutrientLink");
            qb.leftJoinAndSelect("nutrientLink.nutrient", "nutrient");
            qb.leftJoinAndSelect("nutrientLink.sourceDocument", "sourceDocument");
        }
        if (filters.includeAliases) qb.leftJoinAndSelect("food.aliases", "alias");

        if (filters.search) {
            const s = `%${filters.search.toLowerCase()}%`;
            qb.leftJoin("food.aliases", "a"); // ok duplicar join com alias anônimo
            qb.andWhere("(LOWER(food.name) LIKE :s OR LOWER(food.category) LIKE :s OR LOWER(a.alias) LIKE :s)", { s });
        }

        if (filters.category) qb.andWhere("food.category = :category", { category: filters.category });
        if (filters.sourceType) qb.andWhere("food.sourceType = :sourceType", { sourceType: filters.sourceType });
        if (filters.ownerId != null) qb.andWhere("food.owner_id = :ownerId", { ownerId: filters.ownerId });
        if (filters.onlyActive ?? true) qb.andWhere("food.isActive = :isActive", { isActive: true });

        qb.distinct(true)
            .orderBy("food.name", "ASC");
        if (joinVariants) qb.addOrderBy("variant.isDefault", "DESC").addOrderBy("variant.description", "ASC");

        const pageSize = Math.min(filters.pageSize ?? 25, 100);
        const page = filters.page && filters.page > 0 ? filters.page : 1;
        const skip = (page - 1) * pageSize;

        const total = await qb.clone().getCount();
        const data = await qb.skip(skip).take(pageSize).getMany();

        data.forEach(sortFoodAggregates);
        return { data, total, page, pageSize };
    },

    async getFoodById(id: number) {
        const repo = foodRepository();
        const food = await repo.findOne({
            where: { id },
            relations: {
                owner: true,
                aliases: true,
                variants: { measures: true, nutrients: { nutrient: true, sourceDocument: true } },
            },
            order: {
                aliases: { alias: "ASC" },
                variants: {
                    isDefault: "DESC",
                    description: "ASC",
                    measures: { isDefault: "DESC", name: "ASC" },
                    nutrients: { id: "ASC" },
                },
            },
        });
        if (!food) throw new NotFound("Alimento não encontrado.");
        return sortFoodAggregates(food);
    },
};

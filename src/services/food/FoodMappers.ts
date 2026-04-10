import { BadRequest } from "../../models/anthropometry/calculators/utils/errors";
import { Food } from "../../models/food/Food";

export const toDecimalString = (value: number | string | null | undefined) => {
    if (value === null || value === undefined || value === "") return undefined;
    if (typeof value === "number") {
        if (!Number.isFinite(value)) throw new BadRequest("Valor numérico inválido.");
        return value.toString();
    }
    return value.trim();
};

export const sortFoodAggregates = (food: Food) => {
    food.aliases?.sort((a, b) => a.alias.localeCompare(b.alias));
    food.variants?.sort((a, b) => (a.isDefault === b.isDefault)
        ? a.description.localeCompare(b.description)
        : (a.isDefault ? -1 : 1));

    food.variants?.forEach(v => {
        v.measures?.sort((a, b) => (a.isDefault === b.isDefault)
            ? a.name.localeCompare(b.name)
            : (a.isDefault ? -1 : 1));
        v.nutrients?.sort((a, b) => a.nutrient.name.localeCompare(b.nutrient.name));
    });

    return food;
};

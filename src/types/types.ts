import { FoodSourceType } from "../models/enums/FoodSourceType";
import { FoodTexture } from "../models/enums/FoodTexture";
import { UnitBase } from "../models/enums/UnitBase";


export type RequesterContext = { id: number; role: string };

export type FoodAliasInput = { alias: string; locale?: string };

export type HouseholdMeasureInput = {
    name: string;
    quantity?: number | string;
    grams?: number | string | null;
    milliliters?: number | string | null;
    isDefault?: boolean;
    notes?: string | null;
};

export type FoodNutrientInput = {
    nutrientId: number;
    valuePer100: number | string;
    minValue?: number | string | null;
    maxValue?: number | string | null;
    stdDeviation?: number | string | null;
    method?: string | null;
    dataQuality?: string | null;
    sourceDocumentId?: number | null;
};

export type FoodVariantInput = {
    id?: number;
    description: string;
    preparationMethod?: string | null;
    moistureFactor?: number | string | null;
    defaultPortionGml?: number | string | null;
    isDefault?: boolean;
    measures?: HouseholdMeasureInput[];
    nutrients?: FoodNutrientInput[];
};

export type CreateFoodInput = {
    name: string;
    scientificName?: string | null;
    category?: string | null;
    textura?: FoodTexture;
    unitBase?: UnitBase;
    densityGPerMl?: number | string | null;
    sourceType?: FoodSourceType;
    ownerId?: number | null;
    isActive?: boolean;
    aliases?: FoodAliasInput[];
    variants: FoodVariantInput[];
};

export type UpdateFoodInput = Partial<Omit<CreateFoodInput, "variants">> & {
    variants?: FoodVariantInput[];
};

export type FoodListFilters = {
    search?: string;
    category?: string;
    sourceType?: FoodSourceType;
    ownerId?: number | null;
    onlyActive?: boolean;
    includeAliases?: boolean;
    includeVariants?: boolean;
    includeMeasures?: boolean;
    includeNutrients?: boolean;
    includeOwner?: boolean;
    page?: number;
    pageSize?: number;
};

export type MealItemInput = {
    foodVariantId: number | string;
    measureId?: number | string | null;
    quantity?: number | string | null;
    gramsMl?: number | string | null;
    notes?: string | null;
    order?: number | null;
};

export type MealInput = {
    name: string;
    scheduledTime?: string | null;
    order?: number | null;
    items?: MealItemInput[];
};

export type MealPlanDayInput = {
    weekday?: number | null;
    label?: string | null;
    order?: number | null;
    meals?: MealInput[];
};

export type CreateMealPlanInput = {
    patientId: number | string;
    createdById?: number | string | null;
    title: string;
    notes?: string | null;
    startDate?: string | Date | null;
    endDate?: string | Date | null;
    isActive?: boolean;
    days?: MealPlanDayInput[];
    meals?: MealInput[];
};

export type UpdateMealPlanInput = Partial<CreateMealPlanInput> & {
    patientId?: number | string;
};

export type MealPlanListFilters = {
    includeInactive?: boolean;
    titleSearch?: string;
    startDateFrom?: string | Date | null;
    startDateTo?: string | Date | null;
};
import { parseDate } from "../../utils/date-utils";
import { BadRequest } from "../../models/anthropometry/calculators/utils/errors";
import { MealPlan } from "../../models/diet/MealPlan";

export const normalizeDateInput = (value: string | Date | null | undefined, field: string) => {
    if (value === undefined) return undefined;
    if (value === null || value === "") return null;
    try {
        const parsed = parseDate(value as string | Date);
        parsed.setHours(0, 0, 0, 0);
        return parsed;
    } catch (e) {
        throw new BadRequest("Data inválida em " + field + ": " + (e as Error).message);
    }
};

export const sortPlanStructure = (plan: MealPlan) => {
    if (plan.days) {
        plan.days.sort((a, b) => ((a.order ?? 0) - (b.order ?? 0)) || (a.id - b.id));
        for (const day of plan.days) {
            day.meals?.sort((a, b) => ((a.order ?? 0) - (b.order ?? 0)) || (a.id - b.id));
            day.meals?.forEach(m => m.items?.sort((a, b) => ((a.order ?? 0) - (b.order ?? 0)) || (a.id - b.id)));
        }
    }
    if (plan.meals) {
        plan.meals.sort((a, b) => ((a.order ?? 0) - (b.order ?? 0)) || (a.id - b.id));
        plan.meals.forEach(m => m.items?.sort((a, b) => ((a.order ?? 0) - (b.order ?? 0)) || (a.id - b.id)));
    }
    return plan;
};

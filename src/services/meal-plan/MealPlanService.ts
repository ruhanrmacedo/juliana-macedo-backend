import { MealPlanReader } from "./MealPlanReader";
import { MealPlanWriter } from "./MealPlanWriter";
import type { CreateMealPlanInput, UpdateMealPlanInput, MealPlanListFilters, RequesterContext } from "../../types/types";

export const MealPlanService = {
    listPlansByPatient: (patientId: number, requester?: RequesterContext, filters: MealPlanListFilters = {}) =>
        MealPlanReader.listPlansByPatient(patientId, requester, filters),

    getMealPlanById: (planId: number, requester?: RequesterContext) =>
        MealPlanReader.getMealPlanById(planId, requester),

    createMealPlan: (input: CreateMealPlanInput, requester?: RequesterContext) =>
        MealPlanWriter.createMealPlan(input, requester),

    updateMealPlan: (planId: number, input: UpdateMealPlanInput, requester?: RequesterContext) =>
        MealPlanWriter.updateMealPlan(planId, input, requester),

    setMealPlanActive: (planId: number, isActive: boolean, requester?: RequesterContext) =>
        MealPlanWriter.setMealPlanActive(planId, isActive, requester),

    deleteMealPlan: (planId: number, requester?: RequesterContext) =>
        MealPlanWriter.deleteMealPlan(planId, requester),
};

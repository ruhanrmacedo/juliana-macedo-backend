import { MealPlan } from "../models/diet/MealPlan";
import { toUserSummary } from "./userSerializer";

export function toMealPlanListItemDto(plan: MealPlan) {
  return {
    id: plan.id,
    title: plan.title,
    notes: plan.notes,
    startDate: plan.startDate,
    endDate: plan.endDate,
    isActive: plan.isActive,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    createdBy: toUserSummary(plan.createdBy),
  };
}

export function toMealPlanDetailDto(plan: MealPlan) {
  const { patient, createdBy, ...planData } = plan;

  return {
    ...planData,
    patient: toUserSummary(patient),
    createdBy: toUserSummary(createdBy),
  };
}

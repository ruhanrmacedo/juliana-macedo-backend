import { AppDataSource } from "../../config/ormconfig";
import { MealPlan } from "../../models/diet/MealPlan";
import { normalizeDateInput, sortPlanStructure } from "./MealPlanMappers";
import { assertCanAccessPatient } from "./MealPlanPolicies";
import type { MealPlanListFilters, RequesterContext } from "../../types/types";
import {
    toMealPlanDetailDto,
    toMealPlanListItemDto,
} from "../../serializers/mealPlanSerializer";

export const MealPlanReader = {
    async listPlansByPatient(patientId: number, requester: RequesterContext, filters: MealPlanListFilters = {}) {
        assertCanAccessPatient(patientId, requester);

        const repo = AppDataSource.getRepository(MealPlan);
        const qb = repo.createQueryBuilder("plan")
            .leftJoinAndSelect("plan.createdBy", "createdBy")
            .leftJoinAndSelect("plan.patient", "patient")
            .where("plan.patient_id = :patientId", { patientId });

        if (!filters.includeInactive) qb.andWhere("plan.isActive = :isActive", { isActive: true });
        if (filters.titleSearch?.trim()) qb.andWhere("LOWER(plan.title) LIKE :t", { t: `%${filters.titleSearch.trim().toLowerCase()}%` });

        const startFrom = normalizeDateInput(filters.startDateFrom, "startDateFrom");
        const startTo = normalizeDateInput(filters.startDateTo, "startDateTo");
        if (startFrom) qb.andWhere("plan.start_date >= :startFrom", { startFrom });
        if (startTo) qb.andWhere("plan.start_date <= :startTo", { startTo });

        const plans = await qb.orderBy("plan.created_at", "DESC").getMany();
        return plans.map(toMealPlanListItemDto);
    },

    async getMealPlanById(planId: number, requester: RequesterContext) {
        const repo = AppDataSource.getRepository(MealPlan);
        const plan = await repo.findOne({
            where: { id: planId },
            relations: {
                patient: true,
                createdBy: true,
                days: { meals: { items: true } },
                meals: { items: true },
            },
            order: {
                days: { order: "ASC", meals: { order: "ASC", items: { order: "ASC" } } },
                meals: { order: "ASC", items: { order: "ASC" } },
            },
        });

        if (!plan) return null;
        assertCanAccessPatient(plan.patient.id, requester);
        return toMealPlanDetailDto(sortPlanStructure(plan));
    },
};

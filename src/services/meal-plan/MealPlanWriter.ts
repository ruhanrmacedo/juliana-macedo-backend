import { AppDataSource } from "../../config/ormconfig";
import { BadRequest, NotFound, Forbidden } from "../../models/anthropometry/calculators/utils/errors";
import { MealPlan } from "../../models/diet/MealPlan";
import { MealPlanDay } from "../../models/diet/MealPlanDay";
import { Meal } from "../../models/diet/Meal";
import { MealItem } from "../../models/diet/MealItem";
import { User } from "../../models/User";
import { MealPlanReader } from "./MealPlanReader";
import { isStaff, assertCanAccessPatient } from "./MealPlanPolicies";
import { normalizeDateInput } from "./MealPlanMappers";
import { collectReferences, loadReferenceMaps, ensureMeasureMatchesVariant } from "./MealPlanRefs";
import { validateScheduledTime, validateWeekday, toDecimalString, toPositiveInt } from "./MealPlanValidators";
import type { CreateMealPlanInput, UpdateMealPlanInput, RequesterContext, MealInput } from "../../types/types";
import { DeepPartial } from "typeorm";

async function createMealsForContainer(manager: any, params: {
    plan: MealPlan;
    day?: MealPlanDay;
    meals?: MealInput[];
    references: Awaited<ReturnType<typeof loadReferenceMaps>>;
}) {
    const { plan, day, meals, references } = params;
    if (!meals?.length) return;

    const mealRepo = manager.getRepository(Meal);
    const itemRepo = manager.getRepository(MealItem);

    for (let i = 0; i < meals.length; i++) {
        const m = meals[i];
        if (!m.name?.trim()) throw new BadRequest(`Nome da refeição #${i + 1} é obrigatório.`);
        const meal = mealRepo.create({
            plan: day ? undefined : plan,
            day,
            name: m.name.trim(),
            scheduledTime: validateScheduledTime(m.scheduledTime),
            order: m.order ?? i,
        });
        await mealRepo.save(meal);

        for (let j = 0; j < (m.items?.length ?? 0); j++) {
            const it = m.items![j];
            const variantId = toPositiveInt(it.foodVariantId, "foodVariantId");
            const variant = references.variants.get(variantId);
            if (!variant) throw new BadRequest("Variação de alimento " + variantId + " não encontrada.");

            let measure = undefined as any;
            if (it.measureId !== undefined && it.measureId !== null && it.measureId !== "") {
                const measureId = toPositiveInt(it.measureId, "measureId");
                measure = references.measures.get(measureId);
                if (!measure) throw new BadRequest("Medida caseira " + measureId + " não encontrada.");
                ensureMeasureMatchesVariant(measure, variant);
            }

            const item = itemRepo.create({
                meal,
                foodVariant: variant,
                measure,
                quantity: toDecimalString(it.quantity) ?? "1",
                gramsMl: toDecimalString(it.gramsMl),
                notes: it.notes?.trim() ?? undefined,
                order: it.order ?? j,
            });
            await itemRepo.save(item);
        }
    }
}

export const MealPlanWriter = {
    async createMealPlan(input: CreateMealPlanInput, requester?: RequesterContext) {
        if (!input.title?.trim()) throw new BadRequest("Título do plano é obrigatório.");

        const patientId = toPositiveInt(input.patientId, "patientId");
        assertCanAccessPatient(patientId, requester);

        const startDate = normalizeDateInput(input.startDate, "startDate");
        const endDate = normalizeDateInput(input.endDate, "endDate");
        if (startDate && endDate && startDate > endDate) throw new BadRequest("Data inicial não pode ser maior que a data final.");

        const { variantIds, measureIds } = collectReferences(input.days, input.meals);

        const planId = await AppDataSource.transaction(async (manager) => {
            const patient = await manager.getRepository(User).findOne({ where: { id: patientId } });
            if (!patient) throw new BadRequest("Paciente não encontrado.");

            let createdBy: User | null = null;
            const resolvedCreatedById = input.createdById !== undefined ? input.createdById : requester?.id ?? null;
            if (resolvedCreatedById !== null && resolvedCreatedById !== undefined && resolvedCreatedById !== "") {
                const creatorId = toPositiveInt(resolvedCreatedById, "createdById");
                if (!isStaff(requester?.role) && requester && requester.id !== creatorId)
                    throw new Forbidden("Somente administradores podem definir outro criador para o plano.");

                createdBy = await manager.getRepository(User).findOne({ where: { id: creatorId } });
                if (!createdBy) throw new BadRequest("Usuário criador não encontrado.");
            }

            const references = await loadReferenceMaps(manager, variantIds, measureIds);

            const planRepo = manager.getRepository(MealPlan);
            const plan = planRepo.create({
                patient,
                createdBy: createdBy ?? undefined,
                title: input.title.trim(),
                notes: input.notes?.trim() ?? undefined,
                startDate: startDate ?? undefined,
                endDate: endDate ?? undefined,
                isActive: input.isActive ?? true,
            } as DeepPartial<MealPlan>);
            await planRepo.save(plan);

            const dayRepo = manager.getRepository(MealPlanDay);
            for (let d = 0; d < (input.days?.length ?? 0); d++) {
                const dayInput = input.days![d];
                const day = dayRepo.create({
                    plan,
                    weekday: validateWeekday(dayInput.weekday),
                    label: dayInput.label?.trim() ?? undefined,
                    order: dayInput.order ?? d,
                });
                await dayRepo.save(day);
                await createMealsForContainer(manager, { plan, day, meals: dayInput.meals, references });
            }

            await createMealsForContainer(manager, { plan, meals: input.meals, references });

            return plan.id;
        });

        const plan = await MealPlanReader.getMealPlanById(planId, requester);
        return plan!;
    },

    async updateMealPlan(planIdInput: number | string, input: UpdateMealPlanInput, requester?: RequesterContext) {
        const planId = toPositiveInt(planIdInput, "planId");

        if (input.title !== undefined && (!input.title?.trim()))
            throw new BadRequest("Título do plano é obrigatório.");

        const startDate = normalizeDateInput(input.startDate, "startDate");
        const endDate = normalizeDateInput(input.endDate, "endDate");
        if (startDate && endDate && startDate > endDate)
            throw new BadRequest("Data inicial não pode ser maior que a data final.");

        const { variantIds, measureIds } = collectReferences(input.days, input.meals);

        await AppDataSource.transaction(async (manager) => {
            const planRepo = manager.getRepository(MealPlan);
            const plan = await planRepo.findOne({
                where: { id: planId },
                relations: { patient: true, createdBy: true },
            });
            if (!plan) throw new NotFound("Plano alimentar não encontrado.");

            assertCanAccessPatient(plan.patient.id, requester);

            if (input.patientId !== undefined) {
                const newPatientId = toPositiveInt(input.patientId, "patientId");
                if (newPatientId !== plan.patient.id) {
                    if (!isStaff(requester?.role))
                        throw new Forbidden("Somente administradores podem transferir planos entre pacientes.");
                    const newPatient = await manager.getRepository(User).findOne({ where: { id: newPatientId } });
                    if (!newPatient) throw new BadRequest("Paciente destino não encontrado.");
                    plan.patient = newPatient;
                }
            }

            if (input.createdById !== undefined) {
                if (input.createdById === null || input.createdById === "") {
                    plan.createdBy = undefined;
                } else {
                    const creatorId = toPositiveInt(input.createdById, "createdById");
                    if (!isStaff(requester?.role) && requester && requester.id !== creatorId)
                        throw new Forbidden("Somente administradores podem definir outro criador para o plano.");
                    const creator = await manager.getRepository(User).findOne({ where: { id: creatorId } });
                    if (!creator) throw new BadRequest("Usuário criador não encontrado.");
                    plan.createdBy = creator;
                }
            }

            if (input.title !== undefined) plan.title = input.title.trim();
            if (input.notes !== undefined) plan.notes = input.notes?.trim() || undefined;
            if (startDate !== undefined) plan.startDate = startDate ?? undefined;
            if (endDate !== undefined) plan.endDate = endDate ?? undefined;
            if (input.isActive !== undefined) plan.isActive = input.isActive;

            await planRepo.save(plan);

            const references = await loadReferenceMaps(manager, variantIds, measureIds);

            if (input.days !== undefined) {
                await manager.getRepository(MealPlanDay).createQueryBuilder()
                    .delete().where("plan_id = :planId", { planId }).execute();

                const dayRepo = manager.getRepository(MealPlanDay);
                for (let d = 0; d < input.days.length; d++) {
                    const di = input.days[d];
                    const day = dayRepo.create({
                        plan,
                        weekday: validateWeekday(di.weekday),
                        label: di.label?.trim() ?? undefined,
                        order: di.order ?? d,
                    });
                    await dayRepo.save(day);
                    await createMealsForContainer(manager, { plan, day, meals: di.meals, references });
                }
            }

            if (input.meals !== undefined) {
                await manager.getRepository(Meal).createQueryBuilder()
                    .delete().where("plan_id = :planId AND day_id IS NULL", { planId }).execute();

                await createMealsForContainer(manager, { plan, meals: input.meals, references });
            }
        });

        const plan = await MealPlanReader.getMealPlanById(planId, requester);
        return plan!;
    },

    async setMealPlanActive(planIdInput: number | string, isActive: boolean, requester?: RequesterContext) {
        const planId = toPositiveInt(planIdInput, "planId");
        const repo = AppDataSource.getRepository(MealPlan);
        const plan = await repo.findOne({ where: { id: planId }, relations: { patient: true } });
        if (!plan) throw new NotFound("Plano alimentar não encontrado.");

        assertCanAccessPatient(plan.patient.id, requester);

        plan.isActive = isActive;
        await repo.save(plan);

        const reloaded = await MealPlanReader.getMealPlanById(planId, requester);
        return reloaded!;
    },

    async deleteMealPlan(planIdInput: number | string, requester?: RequesterContext) {
        const planId = toPositiveInt(planIdInput, "planId");

        await AppDataSource.transaction(async (manager) => {
            const repo = manager.getRepository(MealPlan);
            const plan = await repo.findOne({ where: { id: planId }, relations: { patient: true } });
            if (!plan) throw new NotFound("Plano alimentar não encontrado.");

            assertCanAccessPatient(plan.patient.id, requester);
            await repo.remove(plan);
        });
    },
};

import { Request, Response } from "express";
import { MealPlanReader } from "../services/meal-plan/MealPlanReader";
import { MealPlanWriter } from "../services/meal-plan/MealPlanWriter";
import { BadRequest, Forbidden, NotFound, Unauthorized } from "../models/anthropometry/calculators/utils/errors";
import type { MealPlanListFilters, RequesterContext } from "../types/types";

type AppRequest = Request & { user?: { id: number; role: string } | (Record<string, unknown> & { id: number; role: string }) };

export class MealPlanController {
    static async listByPatient(req: AppRequest, res: Response) {
        try {
            const patientId = this.requirePatientId(req.query.patientId);
            const filters = this.buildListFilters(req.query);
            const requester = this.getRequester(req);
            const plans = await MealPlanReader.listPlansByPatient(patientId, requester, filters);
            res.json({ data: plans, total: plans.length });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    static async getById(req: AppRequest, res: Response) {
        try {
            const id = this.parseIdParam(req.params.id, "id");
            const requester = this.getRequester(req);
            const plan = await MealPlanReader.getMealPlanById(id, requester);
            if (!plan) {
                throw new NotFound("Plano alimentar não encontrado.");
            }
            res.json({ data: plan });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    static async create(req: AppRequest, res: Response) {
        try {
            const requester = this.getRequester(req);
            const created = await MealPlanWriter.createMealPlan(req.body, requester);
            res.status(201).json({ data: created });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    static async update(req: AppRequest, res: Response) {
        try {
            const id = this.parseIdParam(req.params.id, "id");
            const requester = this.getRequester(req);
            const updated = await MealPlanWriter.updateMealPlan(id, req.body, requester);
            res.json({ data: updated });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    static async setActiveState(req: AppRequest, res: Response) {
        try {
            const id = this.parseIdParam(req.params.id, "id");
            const { isActive } = req.body ?? {};
            if (typeof isActive !== "boolean") {
                throw new BadRequest("Campo isActive deve ser booleano.");
            }
            const requester = this.getRequester(req);
            const updated = await MealPlanWriter.setMealPlanActive(id, isActive, requester);
            res.json({ data: updated });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    static async delete(req: AppRequest, res: Response) {
        try {
            const id = this.parseIdParam(req.params.id, "id");
            const requester = this.getRequester(req);
            await MealPlanWriter.deleteMealPlan(id, requester);
            res.json({ success: true });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    private static handleError(res: Response, error: unknown) {
        if (error instanceof BadRequest || error instanceof NotFound || error instanceof Forbidden || error instanceof Unauthorized) {
            res.status(error.status ?? 400).json({ error: error.message });
            return;
        }
        console.error(error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }

    private static parseIdParam(value: string | undefined, field: string) {
        const parsed = Number(value);
        if (!value || Number.isNaN(parsed)) {
            throw new BadRequest(`Parâmetro ${field} inválido.`);
        }
        return parsed;
    }

    private static requirePatientId(value: unknown): number {
        const parsed = this.parseOptionalNumber(value);
        if (parsed === undefined) {
            throw new BadRequest("Parâmetro patientId é obrigatório.");
        }
        return parsed;
    }

    private static buildListFilters(query: Request["query"]): MealPlanListFilters {
        const filters: MealPlanListFilters = {};
        const { includeInactive, titleSearch, startDateFrom, startDateTo } = query;

        const includeInactiveBool = this.parseOptionalBoolean(includeInactive);
        if (includeInactiveBool !== undefined) filters.includeInactive = includeInactiveBool;
        if (typeof titleSearch === "string" && titleSearch.trim()) filters.titleSearch = titleSearch;
        if (typeof startDateFrom === "string" && startDateFrom.trim()) filters.startDateFrom = startDateFrom;
        if (typeof startDateTo === "string" && startDateTo.trim()) filters.startDateTo = startDateTo;

        return filters;
    }

    private static getRequester(req: AppRequest): RequesterContext | undefined {
        const user = req.user as (Record<string, unknown> & { id?: unknown; role?: unknown }) | undefined;
        if (!user) return undefined;
        const role = typeof user.role === "string" ? user.role : undefined;
        let id: number | undefined;
        if (typeof user.id === "number") {
            id = user.id;
        } else if (typeof user.id === "string") {
            const parsed = Number(user.id);
            id = Number.isNaN(parsed) ? undefined : parsed;
        }
        if (id === undefined || role === undefined) return undefined;
        return { id, role };
    }

    private static parseOptionalNumber(value: unknown): number | undefined {
        if (Array.isArray(value)) return this.parseOptionalNumber(value[0]);
        if (value === null || value === undefined || value === "") return undefined;
        if (typeof value === "number") return Number.isNaN(value) ? undefined : value;
        if (typeof value === "string") {
            const parsed = Number(value);
            return Number.isNaN(parsed) ? undefined : parsed;
        }
        return undefined;
    }

    private static parseOptionalBoolean(value: unknown): boolean | undefined {
        if (Array.isArray(value)) return this.parseOptionalBoolean(value[0]);
        if (value === null || value === undefined || value === "") return undefined;
        if (typeof value === "boolean") return value;
        if (typeof value === "string") {
            const normalized = value.toLowerCase();
            if (normalized === "true") return true;
            if (normalized === "false") return false;
        }
        return undefined;
    }
}

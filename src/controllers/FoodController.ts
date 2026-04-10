import { Request, Response } from "express";
import { FoodReader } from "../services/food/FoodReader";
import { FoodWriter } from "../services/food/FoodWriter";
import { BadRequest, Forbidden, NotFound, Unauthorized } from "../models/anthropometry/calculators/utils/errors";
import { FoodSourceType } from "../models/enums/FoodSourceType";
import type { FoodListFilters, RequesterContext } from "../types/types";

type AppRequest = Request & { user?: { id: number; role: string } | (Record<string, unknown> & { id: number; role: string }) };

export class FoodController {
    static async listFoods(req: AppRequest, res: Response) {
        try {
            const filters = this.buildListFilters(req);
            const result = await FoodReader.listFoods(filters);
            res.json({
                data: result.data,
                total: result.total,
                page: result.page,
                pageSize: result.pageSize,
            });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    static async getFoodById(req: AppRequest, res: Response) {
        try {
            const id = this.parseIdParam(req.params.id, "id");
            const food = await FoodReader.getFoodById(id);
            res.json({ data: food });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    static async createFood(req: AppRequest, res: Response) {
        try {
            const requester = this.getRequester(req);
            const created = await FoodWriter.createFood(req.body, requester);
            res.status(201).json({ data: created });
        } catch (error) {
            this.handleError(res, error);
        }
    }

    static async updateFood(req: AppRequest, res: Response) {
        try {
            const id = this.parseIdParam(req.params.id, "id");
            const requester = this.getRequester(req);
            const updated = await FoodWriter.updateFood(id, req.body, requester);
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
            const updated = await FoodWriter.setActiveState(id, isActive, requester);
            res.json({ data: updated });
        } catch (error) {
            this.handleError(res, error);
        }
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

    private static buildListFilters(req: Request): FoodListFilters {
        const filters: FoodListFilters = {};
        const { search, category, sourceType, ownerId, onlyActive, includeAliases, includeVariants, includeMeasures, includeNutrients, includeOwner, page, pageSize } = req.query;

        if (typeof search === "string" && search.trim()) filters.search = search;
        if (typeof category === "string" && category.trim()) filters.category = category;
        if (typeof sourceType === "string" && this.isValidSourceType(sourceType)) filters.sourceType = sourceType as FoodSourceType;

        const numericOwner = this.parseOptionalNumber(ownerId);
        if (numericOwner !== undefined) filters.ownerId = numericOwner;

        const onlyActiveBool = this.parseOptionalBoolean(onlyActive);
        if (onlyActiveBool !== undefined) filters.onlyActive = onlyActiveBool;

        const includeAliasesBool = this.parseOptionalBoolean(includeAliases);
        if (includeAliasesBool !== undefined) filters.includeAliases = includeAliasesBool;
        const includeVariantsBool = this.parseOptionalBoolean(includeVariants);
        if (includeVariantsBool !== undefined) filters.includeVariants = includeVariantsBool;
        const includeMeasuresBool = this.parseOptionalBoolean(includeMeasures);
        if (includeMeasuresBool !== undefined) filters.includeMeasures = includeMeasuresBool;
        const includeNutrientsBool = this.parseOptionalBoolean(includeNutrients);
        if (includeNutrientsBool !== undefined) filters.includeNutrients = includeNutrientsBool;
        const includeOwnerBool = this.parseOptionalBoolean(includeOwner);
        if (includeOwnerBool !== undefined) filters.includeOwner = includeOwnerBool;

        const parsedPage = this.parseOptionalNumber(page);
        if (parsedPage !== undefined) filters.page = parsedPage;
        const parsedPageSize = this.parseOptionalNumber(pageSize);
        if (parsedPageSize !== undefined) filters.pageSize = parsedPageSize;

        return filters;
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

    private static isValidSourceType(value: string): value is FoodSourceType {
        return (Object.values(FoodSourceType) as string[]).includes(value);
    }
}

import { Request, Response } from "express";
import { AnthropometryService } from "../services/AnthropometryService";
import { AnthropometryMethod } from "../models/enums/AnthropometryMethod";

export const AnthropometryController = {
    async createEvaluation(req: Request, res: Response) {
        try {
            const { userId, measuredAt, ...data } = req.body;

            // Se não for admin, força userId do token:
            const effectiveUserId =
                req.user?.role === "admin" && userId ? Number(userId) : Number(req.user!.id);

            const evaluation = await AnthropometryService.createEvaluation({
                userId: effectiveUserId,
                measuredAt,
                ...data,
            });

            res.status(201).json(evaluation);
        } catch (err: any) {
            res.status(err.status || 400).json({ error: err.message || "Erro ao criar avaliação" });
        }
    },

    async updateEvaluation(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            const payload = req.body;

            const updated = await AnthropometryService.updateEvaluation(id, payload, req.user!);
            res.json(updated);
        } catch (err: any) {
            res.status(err.status || 400).json({ error: err.message || "Erro ao atualizar" });
        }
    },

    async computeWithAutopick(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            const results = await AnthropometryService.computeWithAutopick(id, req.user!);
            res.json({ evaluationId: id, results });
        } catch (err: any) {
            res.status(err.status || 400).json({ error: err.message || "Falha no cálculo (autopick)" });
        }
    },

    async computeWithMethod(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            const methodStr = req.params.method as string;

            // valida se é um valor do enum
            if (!(methodStr in AnthropometryMethod)) {
                return res.status(400).json({ error: "Método inválido." });
            }

            // converte a string para o valor do enum
            const method = AnthropometryMethod[methodStr as keyof typeof AnthropometryMethod];

            const results = await AnthropometryService.computeWithMethod(id, method, req.user!);
            res.json({ evaluationId: id, results });
        } catch (err: any) {
            res.status(err.status || 400).json({ error: err.message || "Falha no cálculo (método)" });
        }
    },

    async getEvaluation(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            const data = await AnthropometryService.getEvaluationWithResults(id, req.user!);
            res.json(data);
        } catch (err: any) {
            res.status(err.status || 400).json({ error: err.message || "Erro ao buscar avaliação" });
        }
    },

    async listByUser(req: Request, res: Response) {
        try {
            const userId = Number(req.params.userId);
            const { page = "1", perPage = "10", from, to } = req.query as any;

            const list = await AnthropometryService.listByUser(userId, {
                page: Number(page),
                perPage: Number(perPage),
                from: from ? new Date(from) : undefined,
                to: to ? new Date(to) : undefined,
            }, req.user!);

            res.json(list);
        } catch (err: any) {
            res.status(err.status || 400).json({ error: err.message || "Erro ao listar" });
        }
    },

    async getLatestByUser(req: Request, res: Response) {
        try {
            const userId = Number(req.params.userId);
            const data = await AnthropometryService.getLatestByUser(userId, req.user!);
            res.json(data);
        } catch (err: any) {
            res.status(err.status || 400).json({ error: err.message || "Erro ao buscar última avaliação" });
        }
    },
};

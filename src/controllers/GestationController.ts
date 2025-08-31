import { Request, Response } from "express";
import { GestationService } from "../services/GestationService";

export const GestationController = {
    async start(req: Request, res: Response) {
        try {
            const tracking = await GestationService.start(req.body, req.user!);
            res.status(201).json(tracking);
        } catch (err: any) {
            res.status(err.status || 400).json({ error: err.message || "Erro ao iniciar" });
        }
    },

    async getCurrent(req: Request, res: Response) {
        try {
            const userId = Number(req.params.userId);
            const data = await GestationService.getCurrentByUser(userId, req.user!);
            res.json(data);
        } catch (err: any) {
            res.status(err.status || 400).json({ error: err.message || "Erro ao buscar" });
        }
    },

    async addVisit(req: Request, res: Response) {
        try {
            const trackingId = Number(req.params.trackingId);
            const v = await GestationService.addVisit(trackingId, req.body, req.user!);
            res.status(201).json(v);
        } catch (err: any) {
            res.status(err.status || 400).json({ error: err.message || "Erro ao criar visita" });
        }
    },

    async listVisits(req: Request, res: Response) {
        try {
            const trackingId = Number(req.params.trackingId);
            const items = await GestationService.listVisits(trackingId, req.user!);
            res.json(items);
        } catch (err: any) {
            res.status(err.status || 400).json({ error: err.message || "Erro ao listar visitas" });
        }
    },
};

import { Request, Response } from "express";
import { UserPhoneService } from "../services/UserPhoneService";

export class UserPhoneController {
    static async add(req: Request, res: Response) {
        try {
            const { number } = req.body;
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: "Usuário não autenticado" });
                return;
            }

            const phone = await UserPhoneService.addPhone(userId, number);
            res.status(201).json(phone);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    static async list(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: "Usuário não autenticado" });
                return;
            }  

            const phones = await UserPhoneService.getPhones(userId);
            res.json(phones);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    static async remove(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: "Usuário não autenticado" });
                return;
            }  

            const result = await UserPhoneService.deletePhone(Number(id), userId);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
}

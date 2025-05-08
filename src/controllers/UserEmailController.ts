import { Request, Response } from "express";
import { UserEmailService } from "../services/UserEmailService";

export class UserEmailController {
    static async add(req: Request, res: Response) {
        try {
            const { email } = req.body;
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: "Usuário não autenticado" });
                return;
            }  

            const emailSaved = await UserEmailService.addEmail(userId, email);
            res.status(201).json(emailSaved);
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

            const emails = await UserEmailService.getEmails(userId);
            res.json(emails);
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

            const result = await UserEmailService.deleteEmail(Number(id), userId);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
}

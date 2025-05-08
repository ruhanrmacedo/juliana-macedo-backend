import { Request, Response } from "express";
import { UserAddressService } from "../services/UserAddressService";

export class UserAddressController {
    static async add(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: "Não autenticado" });
                return;
            }  

            const address = await UserAddressService.addAddress(userId, req.body);
            res.status(201).json(address);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    static async list(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: "Não autenticado" });
                return;
            }  

            const addresses = await UserAddressService.getAddresses(userId);
            res.json(addresses);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }

    static async remove(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ error: "Não autenticado" });
                return;
            }
            
            const { id } = req.params;
            const result = await UserAddressService.deleteAddress(Number(id), userId);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    }
}

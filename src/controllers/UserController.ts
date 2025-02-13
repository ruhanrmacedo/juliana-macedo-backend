import { Request, Response } from "express";
import { UserService } from "../services/UserService";

export class UserController {
  // Rota de Registro
  static async register(req: Request, res: Response) {
    try {
      const { email, password, role } = req.body;
      const user = await UserService.createUser(email, password, role);
      res.status(201).json(user);
      return;
    } catch (error: any) {
      res.status(400).json({ error: error.message });
      return;
    }
  }

  // Rota de Login
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      const result = await UserService.login(email, password);
      res.json(result);
      return;
    } catch (error: any) {
      res.status(400).json({ error: error.message });
      return;
    }
  }
}

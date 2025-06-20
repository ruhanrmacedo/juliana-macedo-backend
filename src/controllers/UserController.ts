import { Request, Response } from "express";
import { UserService } from "../services/UserService";
import axios from "axios";
import qs from "qs";
import { AppDataSource } from "../config/ormconfig";
import { User } from "../models/User";

export class UserController {
  // Rota de Registro
  static async register(req: Request, res: Response) {
    try {
      const { email, name, password, role } = req.body;
      const user = await UserService.createUser(email, name, password, role);
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
      const { email, password, captchaToken } = req.body;

      if (!captchaToken) {
        res.status(400).json({ error: "reCAPTCHA obrigatório" });
        return;
      }

      const secretKey = process.env.RECAPTCHA_SECRET_KEY!;
      const captchaRes = await axios.post(
        "https://www.google.com/recaptcha/api/siteverify",
        qs.stringify({
          secret: process.env.RECAPTCHA_SECRET_KEY!,
          response: captchaToken,
        }),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      if (!captchaRes.data.success) {
        res.status(400).json({ error: "Falha ao verificar reCAPTCHA" });
        return;
      }

      const result = await UserService.login(email, password);
      res.json(result);
      return;
    } catch (error: any) {
      res.status(400).json({ error: error.message });
      return;
    }
  }

  // Novo endpoint de cadastro completo
  static async registerFull(req: Request, res: Response) {
    try {
      const {
        name,
        email,
        password,
        phone,
        address,
        extraPhones,
        extraEmails,
        extraAddresses,
        captchaToken
      } = req.body;

      console.log("Token recebido no cadastro:", captchaToken);

      // Verifica se o token foi enviado
      if (!captchaToken) {
        res.status(400).json({ error: "reCAPTCHA obrigatório" });
        return;
      }

      // Valida o token com o Google
      const secretKey = process.env.RECAPTCHA_SECRET_KEY!;
      const captchaRes = await axios.post(
        "https://www.google.com/recaptcha/api/siteverify",
        qs.stringify({
          secret: secretKey,
          response: captchaToken,
        }),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" }
        }
      );

      if (!captchaRes.data.success) {
        res.status(400).json({ error: "Falha ao verificar reCAPTCHA" });
        return;
      }

      // Cria o usuário normalmente
      const user = await UserService.registerFullUser({
        name,
        email,
        password,
        phone,
        address,
        extraPhones,
        extraEmails,
        extraAddresses
      });

      res.status(201).json({ message: "Usuário cadastrado com sucesso!", user });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async me(req: Request, res: Response) {
    if (!req.user) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }
  
    try {
      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { id: req.user.id },
      });
  
      if (!user) {
        res.status(404).json({ error: "Usuário não encontrado" });
        return;
      }
      
      console.log("Rota /auth/me respondeu com:", {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
      
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });
      return;
    } catch (err) {
      res.status(500).json({ error: "Erro ao buscar usuário" });
      return;
    }
  }
}

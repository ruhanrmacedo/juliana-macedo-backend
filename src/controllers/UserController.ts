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
      const { email, name, password, role, cpf, dataNascimento } = req.body;
      const cleanCpf = cpf.replace(/[^\d]/g, "");
      const parsedDataNascimento = new Date(dataNascimento);
      const user = await UserService.createUser(email, name, password, role, cleanCpf, parsedDataNascimento);
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
        cpf,
        dataNascimento,
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

      const cleanCpf = cpf.replace(/[^\d]/g, "");
      const parsedDataNascimento = new Date(dataNascimento);

      // Cria o usuário normalmente
      const user = await UserService.registerFullUser({
        name,
        email,
        password,
        cpf: cleanCpf,
        dataNascimento: parsedDataNascimento,
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

  // Atualizar dados do usuário autenticado
  static async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: "Não autenticado" });
        return;
      }

      const { name, email, cpf, dataNascimento } = req.body;

      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOneBy({ id: userId });

      if (!user) {
        res.status(404).json({ error: "Usuário não encontrado" });
        return;
      }

      if (name) user.name = name;
      if (email) user.email = email.toLowerCase();
      if (cpf) user.cpf = cpf.replace(/[^\d]/g, "");
      if (dataNascimento) {
        const parsedDate = new Date(dataNascimento);
        if (isNaN(parsedDate.getTime())) {
          res.status(400).json({ error: "Data de nascimento inválida" });
          return;
        }
        user.dataNascimento = parsedDate;
      }

      const updatedUser = await userRepo.save(user);

      res.json({
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        cpf: updatedUser.cpf,
        dataNascimento: updatedUser.dataNascimento,
      });
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
        relations: ["phones", "emails", "addresses"],
      });

      if (!user) {
        res.status(404).json({ error: "Usuário não encontrado" });
        return;
      }

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        cpf: user.cpf,
        dataNascimento: user.dataNascimento,
        phones: user.phones,
        addresses: user.addresses,
        emails: user.emails,
      });
    } catch (err) {
      res.status(500).json({ error: "Erro ao buscar usuário" });
      return;
    }
  }

  // Rota para recuperar e-mail pelo CPF e data de nascimento
  static async recoverEmail(req: Request, res: Response) {
    try {
      const { cpf, dataNascimento, showFullEmail = false } = req.body;

      if (!cpf || !dataNascimento) {
        res.status(400).json({ error: "CPF e data de nascimento são obrigatórios" });
        return;
      }

      const result = await UserService.recoverEmailByCpfAndNascimento(
        cpf,
        dataNascimento,
        showFullEmail
      );

      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      const result = await UserService.resetPasswordByEmail(email);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}

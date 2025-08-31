import { Request, Response } from "express";
import { AppDataSource } from "../config/ormconfig";
import { User, UserRole } from "../models/User";
import bcrypt from "bcrypt";
import { UserPhoneService } from "../services/UserPhoneService";
import { UserEmailService } from "../services/UserEmailService";
import { UserAddressService } from "../services/UserAddressService";

export class AdminUserController {
    static async updateUser(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            const repo = AppDataSource.getRepository(User);
            const user = await repo.findOneBy({ id });
            if (!user) { res.status(404).json({ error: "Usuário não encontrado" }); return; }

            const { name, email, cpf, dataNascimento, role } = req.body as Partial<User> & {
                dataNascimento?: string;
            };

            // validações e unicidade
            if (email !== undefined) {
                const emailLower = String(email).toLowerCase();
                const exists = await repo.findOne({ where: { email: emailLower } });
                if (exists && exists.id !== id) { res.status(409).json({ error: "Email já está em uso" }); return; }
                user.email = emailLower;
            }

            if (cpf !== undefined) {
                const cpfClean = String(cpf).replace(/[^\d]/g, "");
                if (cpfClean.length !== 11) { res.status(400).json({ error: "CPF inválido" }); return; }
                const exists = await repo.findOne({ where: { cpf: cpfClean } });
                if (exists && exists.id !== id) { res.status(409).json({ error: "CPF já está em uso" }); return; }
                user.cpf = cpfClean;
            }

            if (name !== undefined) user.name = name;

            if (role !== undefined) {
                if (!Object.values(UserRole).includes(role as UserRole)) {
                    res.status(400).json({ error: "Role inválido" }); return;
                }
                user.role = role as UserRole;
            }

            if (dataNascimento !== undefined) {
                const d = new Date(dataNascimento);
                if (isNaN(d.getTime())) { res.status(400).json({ error: "Data de nascimento inválida" }); return; }
                user.dataNascimento = d;
            }

            const saved = await repo.save(user);
            const { password, ...safe } = saved as any;
            res.json(safe);
        } catch (e: any) {
            res.status(400).json({ error: e.message });
        }
    }

    static async setPassword(req: Request, res: Response) {
        try {
            const id = Number(req.params.id);
            const { password } = req.body as { password: string };
            if (!password || typeof password !== "string" || password.length < 6) {
                res.status(400).json({ error: "Senha inválida (mín. 6 caracteres)" }); return;
            }
            const repo = AppDataSource.getRepository(User);
            const user = await repo.findOneBy({ id });
            if (!user) { res.status(404).json({ error: "Usuário não encontrado" }); return; }

            user.password = await bcrypt.hash(password, 10);
            await repo.save(user);
            res.json({ message: "Senha atualizada com sucesso" });
        } catch (e: any) {
            res.status(400).json({ error: e.message });
        }
    }

    static async listPhones(req: Request, res: Response) {
        const userId = Number(req.params.id);
        const phones = await UserPhoneService.getPhones(userId);
        res.json(phones);
    }
    static async addPhone(req: Request, res: Response) {
        const userId = Number(req.params.id);
        const { number } = req.body;
        const phone = await UserPhoneService.addPhone(userId, number);
        res.status(201).json(phone);
    }
    static async updatePhone(req: Request, res: Response) {
        const userId = Number(req.params.id);
        const phoneId = Number(req.params.phoneId);
        const { number } = req.body;
        const up = await UserPhoneService.updatePhone(phoneId, userId, number);
        res.json(up);
    }
    static async removePhone(req: Request, res: Response) {
        const userId = Number(req.params.id);
        const phoneId = Number(req.params.phoneId);
        const out = await UserPhoneService.deletePhone(phoneId, userId);
        res.json(out);
    }

    static async listEmails(req: Request, res: Response) {
        const userId = Number(req.params.id);
        const emails = await UserEmailService.getEmails(userId);
        res.json(emails);
    }
    static async addEmail(req: Request, res: Response) {
        const userId = Number(req.params.id);
        const { email } = req.body;
        const e = await UserEmailService.addEmail(userId, email);
        res.status(201).json(e);
    }
    static async updateEmail(req: Request, res: Response) {
        const userId = Number(req.params.id);
        const emailId = Number(req.params.emailId);
        const { email } = req.body;
        const up = await UserEmailService.updateEmail(emailId, userId, email);
        res.json(up);
    }
    static async removeEmail(req: Request, res: Response) {
        const userId = Number(req.params.id);
        const emailId = Number(req.params.emailId);
        const out = await UserEmailService.deleteEmail(emailId, userId);
        res.json(out);
    }

    static async listAddresses(req: Request, res: Response) {
        const userId = Number(req.params.id);
        const addrs = await UserAddressService.getAddresses(userId);
        res.json(addrs);
    }
    static async addAddress(req: Request, res: Response) {
        const userId = Number(req.params.id);
        const addr = await UserAddressService.addAddress(userId, req.body);
        res.status(201).json(addr);
    }
    static async updateAddress(req: Request, res: Response) {
        const userId = Number(req.params.id);
        const addrId = Number(req.params.addressId);
        const up = await UserAddressService.updateAddress(addrId, userId, req.body);
        res.json(up);
    }
    static async removeAddress(req: Request, res: Response) {
        const userId = Number(req.params.id);
        const addrId = Number(req.params.addressId);
        const out = await UserAddressService.deleteAddress(addrId, userId);
        res.json(out);
    }
}
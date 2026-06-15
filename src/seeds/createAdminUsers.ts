import "reflect-metadata";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import { AppDataSource } from "../config/ormconfig";
import { User, UserRole } from "../models/User";

dotenv.config();

async function seedAdmins() {
    await AppDataSource.initialize();

    const userRepo = AppDataSource.getRepository(User);

    const admins = [
        {
            name: process.env.ADMIN_1_NAME,
            email: process.env.ADMIN_1_EMAIL,
            cpf: process.env.ADMIN_1_CPF,
            dataNascimento: process.env.ADMIN_1_BIRTHDATE,
            password: process.env.ADMIN_1_PASSWORD,
        },
        {
            name: process.env.ADMIN_2_NAME,
            email: process.env.ADMIN_2_EMAIL,
            cpf: process.env.ADMIN_2_CPF,
            dataNascimento: process.env.ADMIN_2_BIRTHDATE,
            password: process.env.ADMIN_2_PASSWORD,
        },
    ].filter((admin) => admin.email && admin.password);

    for (const admin of admins) {
        const email = admin.email!.toLowerCase();
        const hashedPassword = await bcrypt.hash(admin.password!, 10);

        const existing = await userRepo.findOne({ where: { email } });

        const data = {
            name: admin.name!,
            email,
            password: hashedPassword,
            role: UserRole.ADMIN,
            cpf: admin.cpf?.replace(/[^\d]/g, ""),
            dataNascimento: admin.dataNascimento
                ? new Date(admin.dataNascimento)
                : undefined,
        };

        if (existing) {
            userRepo.merge(existing, data);
            await userRepo.save(existing);
            console.log(`Admin atualizado: ${email}`);
        } else {
            const user = userRepo.create(data);
            await userRepo.save(user);
            console.log(`Admin criado: ${email}`);
        }
    }

    await AppDataSource.destroy();
    console.log("Seed de admins finalizado.");
}

seedAdmins().catch(async (error) => {
    console.error("Erro ao criar admins:", error);

    if (AppDataSource.isInitialized) {
        await AppDataSource.destroy();
    }

    process.exit(1);
});
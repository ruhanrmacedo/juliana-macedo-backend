import { AppDataSource } from "../config/ormconfig";
import { User } from "../models/User";
import { UserEmail } from "../models/user-info/UserEmail";

const emailRepository = AppDataSource.getRepository(UserEmail);
const userRepository = AppDataSource.getRepository(User);

export class UserEmailService {
    static async addEmail(userId: number, email: string) {
        const user = await userRepository.findOne({ where: { id: userId } });
        if (!user) throw new Error("Usuário não encontrado");

        const emailEntry = emailRepository.create({ email, user });
        return await emailRepository.save(emailEntry);
    }

    static async getEmails(userId: number) {
        return await emailRepository.find({ where: { user: { id: userId } } });
    }

    static async deleteEmail(id: number, userId: number) {
        const email = await emailRepository.findOne({
            where: { id, user: { id: userId } },
        });
        if (!email) throw new Error("Email não encontrado ou não pertence ao usuário");

        await emailRepository.remove(email);
        return { message: "Email removido com sucesso" };
    }
}

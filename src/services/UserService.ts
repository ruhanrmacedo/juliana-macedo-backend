import { instanceToPlain } from "class-transformer";
import { AppDataSource } from "../config/ormconfig";
import { User, UserRole } from "../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const userRepository = AppDataSource.getRepository(User);

export class UserService {
  // Criar usuário (registro)
  static async createUser(email: string, name: string, password: string, role: string = "user") {
    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) throw new Error("Email já está em uso");

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = userRepository.create({
        email,
        name,
        password: hashedPassword,
        role: role as UserRole,
      });
    await userRepository.save(user);

    return instanceToPlain(user);
  }

  // Buscar usuário pelo email
  static async findUserByEmail(email: string) {
    return await userRepository.findOne({ where: { email } });
  }

  // Validar senha e gerar token JWT (login)
  static async login(email: string, password: string) {
    const user = await userRepository.findOne({ where: { email } });
    if (!user) throw new Error("Usuário não encontrado");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Senha inválida");

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET!, {
      expiresIn: "1h",
    });

    return { token, user: instanceToPlain(user) };
  }
}

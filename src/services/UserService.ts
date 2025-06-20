import { instanceToPlain } from "class-transformer";
import { AppDataSource } from "../config/ormconfig";
import { User, UserRole } from "../models/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserPhoneService } from "./UserPhoneService";
import { UserEmailService } from "./UserEmailService";
import { UserAddressService } from "./UserAddressService";

const userRepository = AppDataSource.getRepository(User);

export class UserService {
  // Criar usuário (registro)
  static async createUser(email: string, name: string, password: string, role: string = "user") {
    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) throw new Error("Email já está em uso");

    if (!password || typeof password !== "string") {
      throw new Error("Senha inválida");
    }

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
  
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );
  
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  // Método para full cadastro de usuario
  static async registerFullUser({
    name,
    email,
    password,
    phone,
    address,
    extraPhones,
    extraEmails,
    extraAddresses,
  }: {
    name: string;
    email: string;
    password: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    extraPhones?: string[]; // array de telefones extras
    extraEmails?: string[]; // array de emails extras
    extraAddresses?: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    }[]; // array de endereços extras
  }) {
    const userPlain = await this.createUser(email, name, password, "user");
    const user = await userRepository.findOneByOrFail({ email });

    await UserPhoneService.addPhone(user.id, phone);
    await UserEmailService.addEmail(user.id, email);
    await UserAddressService.addAddress(user.id, address);

    // Campos opcionais
    if (extraPhones && Array.isArray(extraPhones)) {
      for (const p of extraPhones) {
        await UserPhoneService.addPhone(user.id, p);
      }
    }

    if (extraEmails && Array.isArray(extraEmails)) {
      for (const e of extraEmails) {
        await UserEmailService.addEmail(user.id, e);
      }
    }

    if (extraAddresses && Array.isArray(extraAddresses)) {
      for (const a of extraAddresses) {
        await UserAddressService.addAddress(user.id, a);
      }
    }

    return userPlain;
  }
}

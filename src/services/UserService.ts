import { instanceToPlain } from "class-transformer";
import { AppDataSource } from "../config/ormconfig";
import { User, UserRole } from "../models/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { UserPhoneService } from "./UserPhoneService";
import { UserEmailService } from "./UserEmailService";
import { UserAddressService } from "./UserAddressService";
import { MailService } from "./MailService";
import { randomBytes } from "crypto";


const userRepository = AppDataSource.getRepository(User);

export class UserService {
  // Criar usuário (registro)
  static async createUser(email: string, name: string, password: string, role: string = "user", cpf: string, dataNascimento: Date) {
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
      cpf,
      dataNascimento,
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

  // Método para full cadastro de usuário
  static async registerFullUser({
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
  }: {
    name: string;
    email: string;
    password: string;
    cpf: string;
    dataNascimento: string | Date;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    extraPhones?: string[];
    extraEmails?: string[];
    extraAddresses?: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    }[];
  }) {
    // ⚠️ Garante que o CPF terá apenas dígitos
    const cleanedCpf = cpf.replace(/[^\d]/g, "");

    // ⚠️ Garante que dataNascimento seja um Date válido
    const parsedDataNascimento = new Date(dataNascimento);
    if (isNaN(parsedDataNascimento.getTime())) {
      throw new Error("Data de nascimento inválida");
    }

    // Cria o usuário com dados corrigidos
    const userPlain = await this.createUser(email, name, password, "user", cleanedCpf, parsedDataNascimento);

    const user = await userRepository.findOneByOrFail({ email });

    // Telefones
    await UserPhoneService.addPhone(user.id, phone);

    // E-mail principal
    await UserEmailService.addEmail(user.id, email);

    // Endereço principal
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

  // Recuperar e-mail por CPF e data de nascimento
  static async recoverEmailByCpfAndNascimento(
    cpf: string,
    dataNascimento: string | Date,
    showFullEmail: boolean = false
  ) {
    const cleanedCpf = cpf.replace(/[^\d]/g, "");
    const parsedDate = new Date(dataNascimento);

    if (isNaN(parsedDate.getTime())) {
      throw new Error("Data de nascimento inválida");
    }

    const user = await userRepository
      .createQueryBuilder("user")
      .where("user.cpf = :cpf", { cpf: cleanedCpf })
      .andWhere("TO_CHAR(user.data_nascimento, 'YYYY-MM-DD') = :data", {
        data: parsedDate.toISOString().split("T")[0],
      })
      .getOne();

    if (!user) {
      throw new Error("Usuário não encontrado com os dados informados");
    }

    if (showFullEmail) {
      return { email: user.email };
    }

    // Mascarar e-mail (ex: j****o@gmail.com)
    const [local, domain] = user.email.split("@");
    let maskedLocal = "";

    if (local.length <= 3) {
      maskedLocal = local[0] + "*".repeat(local.length - 1);
    } else {
      const visibleStart = local.slice(0, 3); // exibe os 2 primeiros
      const visibleEnd = local.slice(-2);     // exibe o último
      const stars = "*".repeat(local.length - 3); // oculta o restante
      maskedLocal = `${visibleStart}${stars}${visibleEnd}`;
    }

    const maskedEmail = `${maskedLocal}@${domain}`;
    return { email: maskedEmail };
  }

  static async resetPasswordByEmail(email: string) {
    const user = await userRepository.findOne({ where: { email } });
    if (!user) throw new Error("Usuário não encontrado");
  
    const novaSenha = randomBytes(5).toString("hex"); // Ex: 10 caracteres
    user.password = await bcrypt.hash(novaSenha, 10);
    await userRepository.save(user);
  
    await MailService.sendNewPasswordEmail(email, novaSenha);
  
    return { message: "Nova senha enviada por e-mail" };
  }
}

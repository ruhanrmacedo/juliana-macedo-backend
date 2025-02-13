"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const ormconfig_1 = require("../config/ormconfig");
const User_1 = require("../models/User");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const userRepository = ormconfig_1.AppDataSource.getRepository(User_1.User);
class UserService {
    // Criar usuário (registro)
    static async createUser(email, password, role = "user") {
        const existingUser = await userRepository.findOne({ where: { email } });
        if (existingUser)
            throw new Error("Email já está em uso");
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const user = userRepository.create({
            email,
            password: hashedPassword,
            role: role,
        });
        await userRepository.save(user);
        return user;
    }
    // Buscar usuário pelo email
    static async findUserByEmail(email) {
        return await userRepository.findOne({ where: { email } });
    }
    // Validar senha e gerar token JWT (login)
    static async login(email, password) {
        const user = await userRepository.findOne({ where: { email } });
        if (!user)
            throw new Error("Usuário não encontrado");
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch)
            throw new Error("Senha inválida");
        const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: "1h",
        });
        return { token, user };
    }
}
exports.UserService = UserService;

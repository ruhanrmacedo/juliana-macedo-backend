"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const UserService_1 = require("../services/UserService");
class UserController {
    // Rota de Registro
    static async register(req, res) {
        try {
            const { email, password, role } = req.body;
            const user = await UserService_1.UserService.createUser(email, password, role);
            res.status(201).json(user);
            return;
        }
        catch (error) {
            res.status(400).json({ error: error.message });
            return;
        }
    }
    // Rota de Login
    static async login(req, res) {
        try {
            const { email, password } = req.body;
            const result = await UserService_1.UserService.login(email, password);
            res.json(result);
            return;
        }
        catch (error) {
            res.status(400).json({ error: error.message });
            return;
        }
    }
}
exports.UserController = UserController;

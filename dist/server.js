"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const ormconfig_1 = require("./config/ormconfig");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/auth", authRoutes_1.default);
ormconfig_1.AppDataSource.initialize()
    .then(() => {
    console.log("📦 Banco de dados conectado!");
    app.listen(process.env.PORT, () => {
        console.log(`🚀 Servidor rodando na porta ${process.env.PORT}`);
    });
})
    .catch((err) => console.error("Erro ao conectar no banco:", err));

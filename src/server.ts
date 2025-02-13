import express from "express";
import cors from "cors";
import { AppDataSource } from "./config/ormconfig";

const app = express();
app.use(cors());
app.use(express.json());

AppDataSource.initialize()
  .then(() => {
    console.log("📦 Banco de dados conectado!");
    app.listen(process.env.PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${process.env.PORT}`);
    });
  })
  .catch((err) => console.error("Erro ao conectar no banco:", err));

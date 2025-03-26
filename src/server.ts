import express from "express";
import cors from "cors";
import { AppDataSource } from "./config/ormconfig";
import authRoutes from "./routes/authRoutes";
import postRoutes from "./routes/postRoutes";
import userMetricsRoutes from "./routes/userMetricsRoutes";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/post", postRoutes);
app.use("/metrics", userMetricsRoutes);

AppDataSource.initialize()
  .then(() => {
    console.log("Banco de dados conectado!");
    app.listen(process.env.PORT, () => {
      console.log(`Servidor rodando na porta ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.error("Erro ao conectar no banco:", err);
    process.exit(1); // Força o processo a encerrar se o banco não conectar
  });

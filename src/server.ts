import express from "express";
import cors from "cors";
import { AppDataSource } from "./config/ormconfig";
import authRoutes from "./routes/authRoutes";
import postRoutes from "./routes/post.routes";
import userMetricsRoutes from "./routes/userMetrics.routes";
import commentRoutes from "./routes/comment.routes";
import postLikeRoutes from "./routes/postLike.routes";
import userPhoneRoutes from "./routes/userPhone.routes";
import userEmailRoutes from "./routes/userEmail.routes";
import userAddressRoutes from "./routes/userAddress.routes";
import mediaRoutes from "./routes/media.routes";
import "dotenv/config";
import anthropometryRoutes from "./routes/anthropometry.routes";
import userRoutes from "./routes/user.routes";
import adminUserRoutes from "./routes/admin.user.routes";
import gestationRoutes from "./routes/gestation.routes";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/post", postRoutes);
app.use("/metrics", userMetricsRoutes);
app.use("/comments", commentRoutes);
app.use("/likes", postLikeRoutes);
app.use("/phones", userPhoneRoutes);
app.use("/emails", userEmailRoutes);
app.use("/addresses", userAddressRoutes);
app.use("/media", mediaRoutes);
app.use("/anthropometry", anthropometryRoutes);
app.use("/users", userRoutes);
app.use("/admin/users", adminUserRoutes);
app.use("/gestation", gestationRoutes);

app.set("trust proxy", true); // Para obter o IP real do usuário

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

import { config } from "dotenv";
config({ path: ".env.test" });

import { AppDataSource } from "../config/ormconfig";

export default async () => {
  console.log("📌 Inicializando banco de testes...");
  await AppDataSource.initialize();

  console.log("🚀 Rodando migrations no banco de testes...");
  await AppDataSource.runMigrations();

  console.log("✅ Banco de dados de teste pronto!");
};

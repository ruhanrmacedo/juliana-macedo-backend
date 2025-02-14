import { AppDataSource } from "../config/ormconfig";

export default async () => {
  await AppDataSource.initialize();
  console.log("📌 Banco de dados de teste iniciado!");
};

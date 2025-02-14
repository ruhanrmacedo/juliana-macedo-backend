import { AppDataSource } from "../config/ormconfig";

export default async () => {
  await AppDataSource.destroy();
  console.log("🗑️ Banco de dados de teste finalizado!");
};

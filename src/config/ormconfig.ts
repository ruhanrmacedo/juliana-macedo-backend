import { DataSource } from "typeorm";
import dotenv from "dotenv";

dotenv.config();

const isTestEnv = process.env.NODE_ENV === "test";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: isTestEnv ? process.env.DB_TEST_NAME : process.env.DB_NAME,
  synchronize: false,
  logging: true,
  entities: ["src/models/**/*.ts"],
  migrations: ["src/migrations/*.ts"],
});

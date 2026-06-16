import { DataSource } from "typeorm";
import dotenv from "dotenv";

dotenv.config();

const isTestEnv = process.env.NODE_ENV === "test";
const isProduction = process.env.NODE_ENV === "production";

export const AppDataSource = new DataSource(
  process.env.DATABASE_URL && !isTestEnv
    ? {
      type: "postgres",
      url: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      synchronize: false,
      logging: true,
      entities: [isProduction ? "dist/models/**/*.js" : "src/models/**/*.ts"],
      migrations: [
        isProduction ? "dist/migrations/**/*.js" : "src/migrations/**/*.ts",
      ],
    }
    : {
      type: "postgres",
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: isTestEnv ? process.env.DB_TEST_NAME : process.env.DB_NAME,
      synchronize: false,
      logging: true,
      entities: ["src/models/**/*.ts"],
      migrations: ["src/migrations/**/*.ts"],
    }
);
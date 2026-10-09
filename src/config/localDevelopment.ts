import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { DataSourceOptions } from "typeorm";

export function localDevelopmentOptions(): DataSourceOptions {
  if (process.env.NODE_ENV !== "development" || process.env.RENDER) {
    throw new Error("Modo PostgreSQL local permitido apenas em development, fora do Render.");
  }
  const root = path.resolve(__dirname, "../..");
  const envPath = path.join(root, ".env.development.local");
  if (!fs.existsSync(envPath)) {
    throw new Error("Arquivo .env.development.local não encontrado.");
  }
  // Não usa DATABASE_URL, PGHOST, PGDATABASE ou credenciais herdadas.
  const local = dotenv.parse(fs.readFileSync(envPath));
  if (local.DB_HOST !== "127.0.0.1" || local.DB_PORT !== "5432" ||
      local.DB_NAME !== "juliana_macedo" || !local.DB_USER || !local.DB_PASS) {
    throw new Error("Destino local inválido; esperado 127.0.0.1:5432/juliana_macedo.");
  }
  return {
    type: "postgres",
    host: "127.0.0.1",
    port: 5432,
    database: "juliana_macedo",
    username: local.DB_USER,
    password: local.DB_PASS,
    ssl: false,
    synchronize: false,
    migrationsRun: false,
    logging: false,
    entities: [path.join(root, "src/models/**/*.ts")],
    migrations: [],
    extra: {
      application_name: "juliana-macedo-dev-local",
      connectionTimeoutMillis: 5000,
      options: "-c search_path=public",
    },
  };
}

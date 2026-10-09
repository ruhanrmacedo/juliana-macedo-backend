const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const dotenv = require("dotenv");

const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env.development.local");
if (process.env.RENDER) {
  throw new Error("dev:local não pode ser executado no Render.");
}
if (!fs.existsSync(envPath)) {
  throw new Error("Configure .env.development.local a partir do arquivo .example.");
}
const local = dotenv.parse(fs.readFileSync(envPath));
if (local.DB_HOST !== "127.0.0.1" || local.DB_PORT !== "5432" ||
    local.DB_NAME !== "juliana_macedo" || !local.DB_USER || !local.DB_PASS ||
    !local.JWT_SECRET || local.PORT !== "3000") {
  throw new Error("Configuração local inválida: confira o arquivo .example.");
}
const env = { ...process.env };
for (const key of Object.keys(env)) {
  if (/^(DB_|PG|DATABASE_URL$|DOTENV_|JWT_SECRET$|NODE_OPTIONS$|TS_NODE)/i.test(key)) delete env[key];
}
Object.assign(env, {
  DB_HOST: "127.0.0.1", DB_PORT: "5432", DB_NAME: "juliana_macedo",
  DB_USER: local.DB_USER, DB_PASS: local.DB_PASS,
  JWT_SECRET: local.JWT_SECRET, PORT: "3000",
  NODE_ENV: "development", JULIANA_LOCAL_DEV: "1",
  DOTENV_CONFIG_PATH: envPath,
  DOTENV_CONFIG_OVERRIDE: "false",
});
const child = spawn(process.execPath, [
  require.resolve("nodemon/bin/nodemon.js"),
  "--exec", "ts-node --files", "src/server.ts",
], { cwd: root, env, stdio: "inherit" });
child.on("error", () => {
  console.error("Não foi possível iniciar o backend local.");
  process.exitCode = 1;
});
child.on("exit", (code) => { process.exitCode = code ?? 1; });
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

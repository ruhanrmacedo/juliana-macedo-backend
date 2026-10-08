import express from "express";
import request from "supertest";
import authRoutes from "../routes/authRoutes";
import userMetricsRoutes from "../routes/userMetrics.routes";
import { AppDataSource } from "../config/ormconfig";
import { User, UserRole } from "../models/User";
import { UserMetricsService } from "../services/UserMetricsService";
import { NivelAtividade } from "../models/enums/NivelAtividade";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/auth", authRoutes);
  app.use("/metrics", userMetricsRoutes);
  return app;
}

describe("Fase 1 - cadastro básico e métricas opcionais", () => {
  const previousRecaptchaRequired = process.env.RECAPTCHA_REQUIRED;

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || "phase-1-test-secret";
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
  });

  afterAll(async () => {
    process.env.RECAPTCHA_REQUIRED = previousRecaptchaRequired;
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  });

  beforeEach(async () => {
    process.env.RECAPTCHA_REQUIRED = "false";
    await AppDataSource.query(
      "TRUNCATE TABLE password_reset_tokens, user_metrics, users RESTART IDENTITY CASCADE"
    );
  });

  it("cria conta básica normalizando e-mail, forçando role user e sem expor hash", async () => {
    const response = await request(createTestApp()).post("/auth/register").send({
      name: "  Conta Básica  ",
      email: "  CONTA@EXAMPLE.COM ",
      password: "SenhaSegura123",
      confirmPassword: "SenhaSegura123",
      role: UserRole.ADMIN,
      cpf: "12345678901",
      dataNascimento: "1990-01-01",
      captchaToken: "token-de-teste",
    });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      name: "Conta Básica",
      email: "conta@example.com",
      role: UserRole.USER,
      cpf: null,
      dataNascimento: null,
    });
    expect(JSON.stringify(response.body)).not.toMatch(/password|hash/i);

    const saved = await AppDataSource.getRepository(User)
      .createQueryBuilder("user")
      .addSelect("user.password")
      .where("user.email = :email", { email: "conta@example.com" })
      .getOneOrFail();

    expect(saved.role).toBe(UserRole.USER);
    expect(saved.cpf).toBeNull();
    expect(saved.dataNascimento).toBeNull();
    expect(saved.password).not.toBe("SenhaSegura123");
  });

  it("recusa confirmação de senha divergente", async () => {
    const response = await request(createTestApp()).post("/auth/register").send({
      name: "Conta",
      email: "conta@example.com",
      password: "SenhaSegura123",
      confirmPassword: "OutraSenha123",
      captchaToken: "token-de-teste",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/confirma/i);
  });

  it("mantém reCAPTCHA obrigatório quando configurado", async () => {
    process.env.RECAPTCHA_REQUIRED = "true";

    const response = await request(createTestApp()).post("/auth/register").send({
      name: "Conta",
      email: "conta@example.com",
      password: "SenhaSegura123",
      confirmPassword: "SenhaSegura123",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/recaptcha/i);
  });

  it("recusa e-mail duplicado e senha fora da política", async () => {
    const payload = {
      name: "Conta",
      email: "conta@example.com",
      password: "SenhaSegura123",
      confirmPassword: "SenhaSegura123",
      captchaToken: "token-de-teste",
    };

    expect((await request(createTestApp()).post("/auth/register").send(payload)).status).toBe(201);

    const duplicate = await request(createTestApp()).post("/auth/register").send(payload);
    expect(duplicate.status).toBe(400);
    expect(duplicate.body.error).toMatch(/uso/i);

    const weak = await request(createTestApp()).post("/auth/register").send({
      ...payload,
      email: "outra@example.com",
      password: "1234567",
      confirmPassword: "1234567",
    });
    expect(weak.status).toBe(400);
    expect(weak.body.error).toMatch(/8 caracteres/i);
  });

  it("permite login, /auth/me e /metrics/check sem CPF, nascimento ou métricas", async () => {
    await request(createTestApp()).post("/auth/register").send({
      name: "Sem Métricas",
      email: "sem-metricas@example.com",
      password: "SenhaSegura123",
      confirmPassword: "SenhaSegura123",
      captchaToken: "token-de-teste",
    });

    const login = await request(createTestApp()).post("/auth/login").send({
      email: "SEM-METRICAS@EXAMPLE.COM",
      password: "SenhaSegura123",
      captchaToken: "token-de-teste",
    });

    expect(login.status).toBe(200);
    expect(JSON.stringify(login.body)).not.toMatch(/password|hash/i);

    const authorization = `Bearer ${login.body.token}`;
    const me = await request(createTestApp())
      .get("/auth/me")
      .set("Authorization", authorization);
    expect(me.status).toBe(200);
    expect(me.body).toMatchObject({
      email: "sem-metricas@example.com",
      cpf: null,
      dataNascimento: null,
    });
    expect(JSON.stringify(me.body)).not.toMatch(/password|hash/i);

    const check = await request(createTestApp())
      .get("/metrics/check")
      .set("Authorization", authorization);
    expect(check.status).toBe(200);
    expect(check.body).toEqual({ hasMetrics: false });
  });

  it("usa a mesma Harris-Benedict para TMB e TDEE", () => {
    const tmb = UserMetricsService.calculateTMB(70, 1.75, 25, "M");
    const tdee = UserMetricsService.calculateTDEE(
      70,
      1.75,
      25,
      "M",
      NivelAtividade.MODERADAMENTE_ATIVO
    );

    expect(tmb).toBeCloseTo(1730, 5);
    expect(tdee).toBeCloseTo(tmb * 1.55, 5);
  });
});

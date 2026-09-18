import { createHash } from "crypto";
import bcrypt from "bcrypt";
import { AppDataSource } from "../config/ormconfig";
import { PasswordResetToken } from "../models/PasswordResetToken";
import { User, UserRole } from "../models/User";
import { PasswordResetService } from "../services/PasswordResetService";

function tokenFromUrl(url: string): string {
  const parsedUrl = new URL(url);
  const token = new URLSearchParams(parsedUrl.hash.slice(1)).get("token");
  if (!token) throw new Error("Token ausente no fragmento da URL de teste");
  expect(parsedUrl.search).toBe("");
  return token;
}

async function createUser() {
  const repository = AppDataSource.getRepository(User);
  return repository.save(
    repository.create({
      email: "reset@example.com",
      name: "Reset Test",
      password: await bcrypt.hash("SenhaAtual123", 10),
      role: UserRole.USER,
      cpf: "12345678901",
      dataNascimento: new Date("1990-01-01"),
      authVersion: 0,
    })
  );
}

describe("PasswordResetService", () => {
  beforeAll(async () => {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  });

  beforeEach(async () => {
    await AppDataSource.query(
      "TRUNCATE TABLE password_reset_tokens, users RESTART IDENTITY CASCADE"
    );
  });

  it("mantém a senha e armazena somente SHA-256 com validade de 30 minutos", async () => {
    const user = await createUser();
    const originalPasswordHash = user.password;
    let resetUrl = "";

    await PasswordResetService.requestReset(user.email.toUpperCase(), async (message) => {
      resetUrl = message.resetUrl;
      expect(message.expiresInMinutes).toBe(30);
    });

    expect(resetUrl).toContain("/reset-password#token=");
    expect(resetUrl).not.toContain("?token=");
    const rawToken = tokenFromUrl(resetUrl);
    const savedToken = await AppDataSource.getRepository(PasswordResetToken).findOneByOrFail({
      userId: user.id,
    });
    const reloadedUser = await AppDataSource.getRepository(User).findOneByOrFail({ id: user.id });

    expect(reloadedUser.password).toBe(originalPasswordHash);
    expect(savedToken.tokenHash).toBe(
      createHash("sha256").update(rawToken).digest("hex")
    );
    expect(savedToken.tokenHash).not.toContain(rawToken);
    expect(savedToken.tokenHash).toHaveLength(64);

    const ttlMinutes =
      (savedToken.expiresAt.getTime() - savedToken.createdAt.getTime()) / 60000;
    expect(ttlMinutes).toBeGreaterThanOrEqual(29.9);
    expect(ttlMinutes).toBeLessThanOrEqual(30.1);
  });

  it("retorna a mesma resposta genérica para usuário existente e inexistente", async () => {
    const user = await createUser();
    const sender = jest.fn(async () => undefined);

    const existing = await PasswordResetService.requestReset(user.email, sender);
    const missing = await PasswordResetService.requestReset("missing@example.com", sender);

    expect(existing).toEqual(PasswordResetService.genericResponse);
    expect(missing).toEqual(PasswordResetService.genericResponse);
  });

  it("invalida token anterior quando uma nova solicitação é criada", async () => {
    const user = await createUser();
    const sender = jest.fn(async () => undefined);

    await PasswordResetService.requestReset(user.email, sender);
    await PasswordResetService.requestReset(user.email, sender);

    const tokens = await AppDataSource.getRepository(PasswordResetToken).find({
      where: { userId: user.id },
      order: { id: "ASC" },
    });

    expect(tokens).toHaveLength(2);
    expect(tokens[0].invalidatedAt).toBeInstanceOf(Date);
    expect(tokens[1].invalidatedAt).toBeNull();
  });

  it("mantém apenas o token mais recente ativo em solicitações simultâneas", async () => {
    const user = await createUser();
    const sender = jest.fn(async () => undefined);

    await Promise.all([
      PasswordResetService.requestReset(user.email, sender),
      PasswordResetService.requestReset(user.email, sender),
    ]);

    const tokens = await AppDataSource.getRepository(PasswordResetToken).find({
      where: { userId: user.id },
    });
    const activeTokens = tokens.filter(
      (token) => !token.usedAt && !token.invalidatedAt
    );

    expect(tokens).toHaveLength(2);
    expect(activeTokens).toHaveLength(1);
  });

  it("invalida o novo token e preserva a senha quando o envio falha", async () => {
    const user = await createUser();
    const originalPasswordHash = user.password;
    const logSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    await PasswordResetService.requestReset(user.email, async () => {
      throw new Error("provider unavailable");
    });

    const savedToken = await AppDataSource.getRepository(PasswordResetToken).findOneByOrFail({
      userId: user.id,
    });
    const reloadedUser = await AppDataSource.getRepository(User).findOneByOrFail({ id: user.id });

    expect(savedToken.invalidatedAt).toBeInstanceOf(Date);
    expect(reloadedUser.password).toBe(originalPasswordHash);
    logSpy.mockRestore();
  });

  it("redefine a senha uma única vez e incrementa authVersion", async () => {
    const user = await createUser();
    let resetUrl = "";

    await PasswordResetService.requestReset(user.email, async (message) => {
      resetUrl = message.resetUrl;
    });

    const rawToken = tokenFromUrl(resetUrl);
    await PasswordResetService.resetPassword(rawToken, "NovaSenha123");

    const reloadedUser = await AppDataSource.getRepository(User).findOneByOrFail({ id: user.id });
    const savedToken = await AppDataSource.getRepository(PasswordResetToken).findOneByOrFail({
      userId: user.id,
    });

    expect(await bcrypt.compare("NovaSenha123", reloadedUser.password)).toBe(true);
    expect(reloadedUser.authVersion).toBe(1);
    expect(savedToken.usedAt).toBeInstanceOf(Date);
    await expect(
      PasswordResetService.resetPassword(rawToken, "OutraSenha123")
    ).rejects.toThrow("Token inválido ou expirado");
  });

  it("rejeita nova senha com menos de 8 caracteres sem consumir o token", async () => {
    const user = await createUser();
    let resetUrl = "";
    await PasswordResetService.requestReset(user.email, async (message) => {
      resetUrl = message.resetUrl;
    });
    const rawToken = tokenFromUrl(resetUrl);
    await expect(
      PasswordResetService.resetPassword(rawToken, "1234567")
    ).rejects.toThrow("A senha deve ter no mínimo 8 caracteres");
    const savedToken = await AppDataSource.getRepository(PasswordResetToken).findOneByOrFail({
      userId: user.id,
    });
    expect(savedToken.usedAt).toBeNull();
    await PasswordResetService.resetPassword(rawToken, "12345678");
    const reloadedUser = await AppDataSource.getRepository(User).findOneByOrFail({
      id: user.id,
    });
    expect(await bcrypt.compare("12345678", reloadedUser.password)).toBe(true);
  });

  it("rejeita token expirado sem alterar a senha", async () => {
    const user = await createUser();
    const originalPasswordHash = user.password;
    let resetUrl = "";

    await PasswordResetService.requestReset(user.email, async (message) => {
      resetUrl = message.resetUrl;
    });

    await AppDataSource.getRepository(PasswordResetToken).update(
      { userId: user.id },
      { expiresAt: new Date(Date.now() - 1000) }
    );

    await expect(
      PasswordResetService.resetPassword(tokenFromUrl(resetUrl), "NovaSenha123")
    ).rejects.toThrow("Token inválido ou expirado");

    const reloadedUser = await AppDataSource.getRepository(User).findOneByOrFail({ id: user.id });
    expect(reloadedUser.password).toBe(originalPasswordHash);
  });
});

import { Request, Response } from "express";
import { AppDataSource } from "../config/ormconfig";
import { authMiddleware } from "../middleware/authMiddleware";
import { User, UserRole } from "../models/User";
import { UserService } from "../services/UserService";

describe("Segurança de autenticação", () => {
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

  it("sempre cria cadastro público com role user", async () => {
    const user = await UserService.createUser(
      "PUBLIC@EXAMPLE.COM",
      "Public User",
      "Senha123",
      "12345678901",
      new Date("1990-01-01")
    );

    const saved = await AppDataSource.getRepository(User).findOneByOrFail({
      id: Number((user as { id: number }).id),
    });

    expect(saved.role).toBe(UserRole.USER);
    expect(saved.email).toBe("public@example.com");
  });

  it("aplica mínimo de 8 caracteres no cadastro público", async () => {
    await expect(
      UserService.createUser(
        "short-password@example.com",
        "Short Password",
        "1234567",
        "12345678901",
        new Date("1990-01-01")
      )
    ).rejects.toThrow("A senha deve ter no mínimo 8 caracteres");
  });

  it("recover-email permanece mascarado mesmo com argumento extra", async () => {
    const repository = AppDataSource.getRepository(User);
    await repository.save(
      repository.create({
        email: "juliana@example.com",
        name: "Juliana",
        password: "hash-de-teste",
        role: UserRole.ADMIN,
        cpf: "12345678901",
        dataNascimento: new Date("1990-01-01T12:00:00Z"),
        authVersion: 0,
      })
    );

    const result = await (UserService.recoverEmailByCpfAndNascimento as any)(
      "123.456.789-01",
      "1990-01-01",
      true
    );

    expect(result.email).not.toBe("juliana@example.com");
    expect(result.email).toMatch(/^ju\*+a@example\.com$/);
  });

  it("invalida JWT anterior após mudança autenticada de senha", async () => {
    await UserService.createUser(
      "session@example.com",
      "Session User",
      "SenhaAtual123",
      "12345678901",
      new Date("1990-01-01")
    );

    const login = await UserService.login("session@example.com", "SenhaAtual123");
    await UserService.changePassword(login.user.id, "SenhaAtual123", "NovaSenha123");

    const req = {
      header: (name: string) =>
        name === "Authorization" ? `Bearer ${login.token}` : undefined,
    } as Request;
    const res = {} as Response;
    const next = jest.fn();

    await authMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toMatchObject({ status: 401 });
  });

  it("rejeita senha com menos de 8 caracteres na mudança autenticada", async () => {
    await UserService.createUser(
      "password-policy@example.com",
      "Password Policy",
      "SenhaAtual123",
      "12345678901",
      new Date("1990-01-01")
    );
    const user = await UserService.findUserByEmail("password-policy@example.com");
    await expect(
      UserService.changePassword(user!.id, "SenhaAtual123", "1234567")
    ).rejects.toThrow("A senha deve ter no mínimo 8 caracteres");
  });
});

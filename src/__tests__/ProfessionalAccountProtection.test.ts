jest.mock("../config/ormconfig", () => {
  const repository = {
    findOne: jest.fn(), findOneBy: jest.fn(), save: jest.fn(),
    update: jest.fn(), createQueryBuilder: jest.fn(),
  };
  return {
    AppDataSource: {
      getRepository: jest.fn(() => repository), transaction: jest.fn(),
      initialize: jest.fn(() => { throw new Error("PostgreSQL initialization forbidden."); }),
    },
  };
});
jest.mock("bcrypt", () => ({
  __esModule: true,
  default: {
    hash: jest.fn(async () => "test-password-hash"),
    compare: jest.fn(async (value: string) => value === "CurrentPass1!"),
  },
}));
jest.mock("../services/MailService", () => ({
  MailService: { sendPasswordResetEmail: jest.fn(async () => undefined) },
}));

import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { AppDataSource } from "../config/ormconfig";
import adminUserRoutes from "../routes/admin.user.routes";
import authRoutes from "../routes/authRoutes";
import { AdminUserController } from "../controllers/AdminUserController";
import { User } from "../models/User";
import { PasswordResetToken } from "../models/PasswordResetToken";
import { MailService } from "../services/MailService";
import { professionalErrorResponse } from "../services/professional/ProfessionalErrors";
import {
  assertProfessionalAccountMutation, assertProfessionalAdmin,
} from "../services/professional/ProfessionalPolicies";

const SECRET = "professional-account-unit-only-secret";
const repository = AppDataSource.getRepository(User) as unknown as {
  findOne: jest.Mock; findOneBy: jest.Mock; save: jest.Mock;
  update: jest.Mock; createQueryBuilder: jest.Mock;
};

function app() {
  const application = express();
  application.use(express.json());
  application.use("/admin/users", adminUserRoutes);
  application.use("/auth", authRoutes);
  application.use(((error, _req, res, _next) => {
    professionalErrorResponse(res, error);
  }) as express.ErrorRequestHandler);
  return application;
}

function token(id: number) {
  return jwt.sign({ id, role: "admin", authVersion: 0 }, SECRET, { expiresIn: "5m" });
}

describe("professional account protection and legitimate recovery (all stores mocked)", () => {
  const oldId = process.env.PROFESSIONAL_ADMIN_USER_ID;
  const oldSecret = process.env.JWT_SECRET;
  let protectedUser: User;
  let save: jest.Mock;
  let users: Map<number, User>;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PROFESSIONAL_ADMIN_USER_ID = "101"; // Test fixture, never deployment configuration.
    process.env.JWT_SECRET = SECRET;
    protectedUser = Object.assign(new User(), {
      id: 101, email: "juliana@example.test", name: "Juliana",
      role: "admin", authVersion: 0, password: "test-password-hash",
      cpf: "12345678901", dataNascimento: new Date("1990-01-01T12:00:00Z"),
    });
    users = new Map([
      [101, protectedUser],
      [102, Object.assign(new User(), { id: 102, email: "admin@example.test", role: "admin", authVersion: 0 })],
      [103, Object.assign(new User(), { id: 103, email: "reader@example.test", role: "user", authVersion: 0 })],
    ]);
    repository.findOne.mockImplementation(async ({ where }: {
      where: { id?: number; email?: string };
    }) => where.id !== undefined ? users.get(where.id) ?? null
      : [...users.values()].find((user) => user.email === where.email) ?? null);
    repository.findOneBy.mockImplementation(async ({ id }: { id: number }) => users.get(id) ?? null);
    repository.save.mockImplementation(async (value: User) => value);
    const builder = {
      addSelect: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(), setLock: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () => protectedUser),
    };
    repository.createQueryBuilder.mockReturnValue(builder);

    const resetToken = {
      id: 1, user: protectedUser, userId: 101, usedAt: null, invalidatedAt: null,
      expiresAt: new Date(Date.now() + 600000),
    };
    const resetBuilder = {
      setLock: jest.fn().mockReturnThis(), innerJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(), getOne: jest.fn(async () => resetToken),
    };
    save = jest.fn(async (...values: unknown[]) => values[values.length - 1]);
    const manager = {
      getRepository: jest.fn((model: unknown) => model === PasswordResetToken
        ? { createQueryBuilder: () => resetBuilder } : repository),
      create: jest.fn((_model: unknown, value: object) => ({ ...value, id: 1 })),
      save, update: jest.fn(async () => ({ affected: 1 })),
    };
    jest.mocked(AppDataSource.transaction).mockImplementation(
      (async (callback: unknown) =>
        (callback as (manager: unknown) => Promise<unknown>)(manager)) as never
    );
  });

  afterAll(() => {
    if (oldId === undefined) delete process.env.PROFESSIONAL_ADMIN_USER_ID;
    else process.env.PROFESSIONAL_ADMIN_USER_ID = oldId;
    if (oldSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = oldSecret;
  });

  it.each([
    { email: "attacker@example.test" }, { role: "user" },
    { name: "Substituído" }, { cpf: "98765432100" },
    { dataNascimento: "2000-01-01" },
  ])("blocks another administrator changing the protected account: %j", async (body) => {
    const response = await request(app()).put("/admin/users/101")
      .set("Authorization", `Bearer ${token(102)}`).send(body);
    expect(response.status).toBe(403);
    expect(repository.findOneBy).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("blocks another administrator resetting the protected password", async () => {
    expect((await request(app()).put("/admin/users/101/password")
      .set("Authorization", `Bearer ${token(102)}`)
      .send({ password: "NewPass2!" })).status).toBe(403);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("also protects controllers when invoked without the router", async () => {
    const req = { params: { id: "101" }, user: { id: 102, role: "admin" }, body: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    await AdminUserController.updateUser(req as never, res as never);
    await AdminUserController.setPassword(req as never, res as never);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(repository.findOneBy).not.toHaveBeenCalled();
  });

  it("preserves another administrator's ability to update unrelated users", async () => {
    const response = await request(app()).put("/admin/users/103")
      .set("Authorization", `Bearer ${token(102)}`).send({ name: "Outro usuário" });
    expect(response.status).toBe(200);
    expect(response.body.name).toBe("Outro usuário");
  });

  it("does not block unrelated user features when professional configuration is missing", async () => {
    delete process.env.PROFESSIONAL_ADMIN_USER_ID;
    expect(() => assertProfessionalAdmin({ id: 101, role: "admin" }))
      .toThrow("indisponível");
    expect((await request(app()).put("/admin/users/103")
      .set("Authorization", `Bearer ${token(102)}`).send({ name: "Outro usuário" })).status).toBe(200);
  });

  it("allows the protected account to administer its own credentials", async () => {
    expect((await request(app()).put("/admin/users/101")
      .set("Authorization", `Bearer ${token(101)}`)
      .send({ email: "juliana-new@example.test" })).status).toBe(200);
    expect((await request(app()).put("/admin/users/101/password")
      .set("Authorization", `Bearer ${token(101)}`)
      .send({ password: "NewPass2!" })).status).toBe(200);
    expect(protectedUser.authVersion).toBe(1);
  });

  it("preserves authenticated self-service profile editing", async () => {
    const response = await request(app()).put("/auth/me")
      .set("Authorization", `Bearer ${token(101)}`)
      .send({ email: "juliana-self@example.test", role: "user", id: 102 });
    expect(response.status).toBe(200);
    expect(protectedUser.email).toBe("juliana-self@example.test");
    expect(protectedUser.role).toBe("admin");
    expect(protectedUser.id).toBe(101);
  });

  it("preserves self-service password changes requiring the current password", async () => {
    expect((await request(app()).post("/auth/change-password")
      .set("Authorization", `Bearer ${token(101)}`)
      .send({
        currentPassword: "CurrentPass1!", newPassword: "NewPass2!", confirmPassword: "NewPass2!",
      })).status).toBe(200);
    expect(protectedUser.authVersion).toBe(1);
  });

  it("preserves email recovery without granting account access", async () => {
    const response = await request(app()).post("/auth/recover-email")
      .send({ cpf: "12345678901", dataNascimento: "1990-01-01" });
    expect(response.status).toBe(200);
    expect(response.body.email).toBe("ju****a@example.test");
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("preserves password recovery delivery to the stored login email", async () => {
    expect((await request(app()).post("/auth/forgot-password")
      .send({ email: protectedUser.email })).status).toBe(202);
    expect(MailService.sendPasswordResetEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "juliana@example.test",
    }));
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("preserves valid reset-token recovery without requiring an admin session", async () => {
    expect((await request(app()).post("/auth/reset-password")
      .send({ token: "valid-mocked-reset-token", newPassword: "NewPass2!", confirmPassword: "NewPass2!" }))
      .status).toBe(200);
    expect(save).toHaveBeenCalledWith(User, expect.objectContaining({ id: 101, authVersion: 1 }));
  });

  it("does not expand permissions for common users", () => {
    expect(() => assertProfessionalAdmin({ id: 101, role: "user" })).toThrow("Acesso negado");
    expect(() => assertProfessionalAccountMutation(101, { id: 101, role: "user" })).toThrow();
  });
});

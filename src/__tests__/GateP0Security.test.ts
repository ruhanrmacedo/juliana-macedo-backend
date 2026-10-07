import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { getMetadataArgsStorage } from "typeorm";
import { AppDataSource } from "../config/ormconfig";
import { User, UserRole } from "../models/User";
import mealPlanRoutes from "../routes/mealPlanRoutes";
import mediaRoutes from "../routes/media.routes";
import { MealPlanReader } from "../services/meal-plan/MealPlanReader";
import { MealPlanWriter } from "../services/meal-plan/MealPlanWriter";
import { responseSanitizer, sanitizeResponseBody } from "../middleware/responseSanitizer";
import { toCommentDto } from "../serializers/commentSerializer";
import { toMealPlanDetailDto } from "../serializers/mealPlanSerializer";
import { toPostDto } from "../serializers/postSerializer";
import * as imageUpload from "../utils/imageUpload";

type AuthUser = {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  authVersion: number;
};

const JWT_SECRET = "gate-p0-local-test-secret";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(responseSanitizer);
  app.use("/meal-plans", mealPlanRoutes);
  app.use("/media", mediaRoutes);
  app.use(
    (
      error: { status?: number; message?: string },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      res.status(error.status ?? 500).json({ error: error.message ?? "Erro" });
    }
  );
  return app;
}

function makeToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      authVersion: user.authVersion,
    },
    JWT_SECRET,
    { expiresIn: "5m" }
  );
}

describe("Gate P0 de segurança", () => {
  const commonUser: AuthUser = {
    id: 1,
    email: "user-a@example.com",
    name: "User A",
    role: UserRole.USER,
    authVersion: 0,
  };
  const otherUser: AuthUser = {
    id: 2,
    email: "user-b@example.com",
    name: "User B",
    role: UserRole.USER,
    authVersion: 0,
  };
  const admin: AuthUser = {
    id: 3,
    email: "admin@example.com",
    name: "Admin",
    role: UserRole.ADMIN,
    authVersion: 0,
  };

  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  beforeEach(() => {
    const users = new Map<number, AuthUser>([
      [commonUser.id, commonUser],
      [otherUser.id, otherUser],
      [admin.id, admin],
    ]);

    jest.spyOn(AppDataSource, "getRepository").mockImplementation(
      () =>
        ({
          findOne: jest.fn(async ({ where }: { where: { id: number } }) => {
            return users.get(where.id) ?? null;
          }),
        }) as never
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("recusa leitura anônima de plano alimentar", async () => {
    const response = await request(createTestApp()).get(
      `/meal-plans?patientId=${commonUser.id}`
    );

    expect(response.status).toBe(401);
  });

  it("impede usuário A de listar planos do usuário B", async () => {
    const response = await request(createTestApp())
      .get(`/meal-plans?patientId=${otherUser.id}`)
      .set("Authorization", `Bearer ${makeToken(commonUser)}`);

    expect(response.status).toBe(403);
  });

  it.each([
    ["post", "/meal-plans"],
    ["put", "/meal-plans/10"],
    ["patch", "/meal-plans/10/active"],
    ["delete", "/meal-plans/10"],
  ] as const)(
    "impede usuário comum de executar %s em prescrição clínica",
    async (method, path) => {
      const response = await request(createTestApp())
        [method](path)
        .set("Authorization", `Bearer ${makeToken(commonUser)}`)
        .send({ patientId: commonUser.id, title: "Plano", isActive: true });

      expect(response.status).toBe(403);
    }
  );

  it("mantém leitura do próprio plano disponível para usuário autenticado", async () => {
    jest.spyOn(MealPlanReader, "listPlansByPatient").mockResolvedValue([]);

    const response = await request(createTestApp())
      .get(`/meal-plans?patientId=${commonUser.id}`)
      .set("Authorization", `Bearer ${makeToken(commonUser)}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [], total: 0 });
  });

  it("mantém escrita de plano disponível para admin autorizado", async () => {
    jest.spyOn(MealPlanWriter, "createMealPlan").mockResolvedValue({
      id: 10,
      title: "Plano autorizado",
    } as never);

    const response = await request(createTestApp())
      .post("/meal-plans")
      .set("Authorization", `Bearer ${makeToken(admin)}`)
      .send({ patientId: commonUser.id, title: "Plano autorizado" });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      id: 10,
      title: "Plano autorizado",
    });
  });

  it("recusa upload anônimo", async () => {
    const response = await request(createTestApp())
      .post("/media/image")
      .attach("image", Buffer.from([0xff, 0xd8, 0xff]), {
        filename: "image.jpg",
        contentType: "image/jpeg",
      });

    expect(response.status).toBe(401);
  });

  it("recusa upload administrativo para usuário sem permissão", async () => {
    const response = await request(createTestApp())
      .post("/media/image")
      .set("Authorization", `Bearer ${makeToken(commonUser)}`)
      .attach("image", Buffer.from([0xff, 0xd8, 0xff]), {
        filename: "image.jpg",
        contentType: "image/jpeg",
      });

    expect(response.status).toBe(403);
  });

  it("recusa arquivo cujo conteúdo não corresponde ao tipo declarado", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await request(createTestApp())
      .post("/media/image")
      .set("Authorization", `Bearer ${makeToken(admin)}`)
      .attach("image", Buffer.from("não é uma imagem"), {
        filename: "fake.jpg",
        contentType: "image/jpeg",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/imagem válida/i);
  });

  it("mantém upload de post disponível para admin autorizado", async () => {
    jest.spyOn(imageUpload, "uploadPostImage").mockResolvedValue({
      secure_url: "https://example.test/posts/image.jpg",
      public_id: "posts/image",
    } as never);

    const response = await request(createTestApp())
      .post("/media/image")
      .set("Authorization", `Bearer ${makeToken(admin)}`)
      .attach("image", Buffer.from([0xff, 0xd8, 0xff, 0x00]), {
        filename: "image.jpg",
        contentType: "image/jpeg",
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      url: "https://example.test/posts/image.jpg",
      publicId: "posts/image",
    });
  });

  it("marca a coluna password como não selecionável por padrão", () => {
    const passwordColumn = getMetadataArgsStorage().columns.find(
      (column) =>
        column.target === User && column.propertyName === "password"
    );

    expect(passwordColumn?.options.select).toBe(false);
  });

  it("remove hashes recursivamente da camada HTTP de defesa", () => {
    const sanitized = sanitizeResponseBody({
      password: "hash-1",
      password_hash: "hash-2",
      nested: {
        passwordHash: "hash-3",
        hashedPassword: "hash-4",
        tokenHash: "hash-5",
        token_hash: "hash-6",
        token: "jwt-que-deve-ser-preservado",
      },
    });

    expect(JSON.stringify(sanitized)).not.toContain("hash-");
    expect(sanitized).toMatchObject({
      nested: { token: "jwt-que-deve-ser-preservado" },
    });
  });

  it("serializa relações User de posts, comentários e planos por projeção segura", () => {
    const unsafeUser = {
      id: commonUser.id,
      name: commonUser.name,
      email: commonUser.email,
      password: "hash-que-não-pode-sair",
      cpf: "00000000000",
    } as User;

    const payload = {
      post: toPostDto({
        id: 1,
        title: "Post",
        content: "Conteúdo",
        author: unsafeUser,
      } as never),
      comment: toCommentDto({
        id: 1,
        content: "Comentário",
        user: unsafeUser,
      } as never),
      mealPlan: toMealPlanDetailDto({
        id: 1,
        title: "Plano",
        patient: unsafeUser,
        createdBy: unsafeUser,
      } as never),
    };

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain("hash-que-não-pode-sair");
    expect(serialized).not.toContain(commonUser.email);
    expect(serialized).not.toContain("00000000000");
    expect(payload.post.author).toEqual({
      id: commonUser.id,
      name: commonUser.name,
    });
  });
});

import express from "express";
import request from "supertest";
import { AppDataSource } from "../config/ormconfig";
import postRoutes from "../routes/post.routes";
import { UserService } from "../services/UserService";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/post", postRoutes);
  app.use(
    (
      err: { status?: number; message?: string },
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      res.status(err.status ?? 500).json({ error: err.message ?? "Erro" });
    }
  );
  return app;
}

describe("Segurança das rotas de posts", () => {
  beforeAll(async () => {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  });

  beforeEach(async () => {
    await AppDataSource.query(
      "TRUNCATE TABLE password_reset_tokens, posts, users RESTART IDENTITY CASCADE"
    );
  });

  it.each([
    ["post", "/post"],
    ["put", "/post/1"],
    ["patch", "/post/1/toggle"],
    ["delete", "/post/1"],
  ] as const)("bloqueia %s para usuário não admin", async (method, path) => {
    await UserService.createUser(
      "reader@example.com",
      "Reader",
      "Senha123",
      "12345678901",
      new Date("1990-01-01T12:00:00Z")
    );
    const login = await UserService.login("reader@example.com", "Senha123");
    const app = createTestApp();

    const response = await request(app)
      [method](path)
      .set("Authorization", `Bearer ${login.token}`);

    expect(response.status).toBe(403);
  });
});

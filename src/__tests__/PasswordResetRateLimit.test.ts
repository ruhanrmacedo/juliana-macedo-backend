import express from "express";
import request from "supertest";
import { forgotPasswordRateLimit } from "../middleware/passwordResetRateLimit";

describe("forgotPasswordRateLimit", () => {
  it("bloqueia a sexta solicitação do mesmo IP na janela", async () => {
    const app = express();
    app.set("trust proxy", 1);
    app.post("/forgot", forgotPasswordRateLimit, (_req, res) => {
      res.status(202).json({ ok: true });
    });

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await request(app).post("/forgot");
      expect(response.status).toBe(202);
    }

    const blocked = await request(app).post("/forgot");
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({
      error: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    });
  });
});

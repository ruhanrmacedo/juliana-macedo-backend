jest.mock("../config/ormconfig", () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    initialize: jest.fn(() => { throw new Error("Database connection forbidden."); }),
  },
}));

import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { QueryFailedError } from "typeorm";
import { NotFound } from "../models/anthropometry/calculators/utils/errors";
import { AppDataSource } from "../config/ormconfig";
import publicRoutes from "../routes/professional.routes";
import adminRoutes from "../routes/admin.professional.routes";
import { ProfessionalApiService } from "../services/professional/ProfessionalService";
import { ProfessionalConflict, professionalErrorResponse } from "../services/professional/ProfessionalErrors";
import { toPublicProfessionalProfileDto } from "../serializers/professionalSerializer";
import { profileFixture, serviceFixture, professionalTestActor } from "./helpers/professionalFixtures";

const SECRET = "professional-unit-test-only-secret";
const endpoints = [
  ["get", "/profile"], ["patch", "/profile"],
  ["get", "/services"], ["post", "/services"],
  ["get", "/services/10"], ["patch", "/services/10"],
  ["get", "/faqs"], ["post", "/faqs"],
  ["get", "/faqs/20"], ["patch", "/faqs/20"],
] as const;

function app() {
  const application = express();
  application.use(express.json());
  application.get("/health", (_req, res) => { res.json({ ok: true }); });
  application.use("/professional", publicRoutes);
  application.use("/admin/professional", adminRoutes);
  application.use(((error, _req, res, _next) => {
    professionalErrorResponse(res, error);
  }) as express.ErrorRequestHandler);
  return application;
}

function token(id = professionalTestActor.id, claims: object = {}, options: jwt.SignOptions = {}) {
  return jwt.sign({ id, role: "admin", authVersion: 0, ...claims }, SECRET, {
    expiresIn: "5m", ...options,
  });
}

describe("professional endpoint authentication and authorization (no PostgreSQL)", () => {
  const originalId = process.env.PROFESSIONAL_ADMIN_USER_ID;
  const originalSecret = process.env.JWT_SECRET;
  const users = new Map<number, { id: number; role: string; authVersion: number }>();
  const methods = [
    "publicProfile", "publicServices", "publicFaqs", "adminProfile",
    "patchProfile", "adminServices", "adminService", "createService",
    "patchService", "adminFaqs", "adminFaq", "createFaq", "patchFaq",
  ] as const;

  beforeEach(() => {
    process.env.PROFESSIONAL_ADMIN_USER_ID = String(professionalTestActor.id);
    process.env.JWT_SECRET = SECRET;
    users.clear();
    users.set(101, { id: 101, role: "admin", authVersion: 0 });
    users.set(102, { id: 102, role: "admin", authVersion: 0 });
    users.set(103, { id: 103, role: "user", authVersion: 0 });
    jest.mocked(AppDataSource.getRepository).mockReturnValue({
      findOne: jest.fn(async ({ where }: { where: { id: number } }) => users.get(where.id) ?? null),
    } as never);
    for (const method of methods) {
      jest.spyOn(ProfessionalApiService.prototype, method).mockResolvedValue({ ok: true } as never);
    }
  });

  afterEach(() => { jest.restoreAllMocks(); });
  afterAll(() => {
    if (originalId === undefined) delete process.env.PROFESSIONAL_ADMIN_USER_ID;
    else process.env.PROFESSIONAL_ADMIN_USER_ID = originalId;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  it.each(endpoints)("blocks anonymous %s %s", async (method, path) => {
    const response = await request(app())[method](`/admin/professional${path}`).send({ version: 1 });
    expect(response.status).toBe(401);
  });

  it.each(endpoints)("blocks common users on %s %s despite admin token claims", async (method, path) => {
    const response = await request(app())[method](`/admin/professional${path}`)
      .set("Authorization", `Bearer ${token(103)}`).send({ version: 1 });
    expect(response.status).toBe(403);
  });

  it.each(endpoints)("blocks another admin on %s %s", async (method, path) => {
    const response = await request(app())[method](`/admin/professional${path}`)
      .set("Authorization", `Bearer ${token(102)}`).send({ version: 1 });
    expect(response.status).toBe(403);
  });

  it.each(endpoints)("allows the authorized account on %s %s", async (method, path) => {
    const response = await request(app())[method](`/admin/professional${path}`)
      .set("Authorization", `Bearer ${token()}`).send({ version: 1 });
    expect(response.status).toBe(method === "post" ? 201 : 200);
  });

  it.each([undefined, "", "0", "-1", "101.5", "1e2", "not-an-id"])(
    "disables only professional administration for configuration %s", async (value) => {
      if (value === undefined) delete process.env.PROFESSIONAL_ADMIN_USER_ID;
      else process.env.PROFESSIONAL_ADMIN_USER_ID = value;
      expect((await request(app()).get("/admin/professional/profile")
        .set("Authorization", `Bearer ${token()}`)).status).toBe(503);
      expect((await request(app()).get("/professional/profile")).status).toBe(200);
      expect((await request(app()).get("/health")).status).toBe(200);
    }
  );

  it.each(["/profile", "/services", "/faqs"])("allows public access to %s", async (path) => {
    expect((await request(app()).get(`/professional${path}`)).status).toBe(200);
  });

  it.each([
    ["/profile", "publicProfile"], ["/services", "publicServices"], ["/faqs", "publicFaqs"],
  ] as const)("returns 404 for unavailable parent at %s", async (path, method) => {
    jest.mocked(ProfessionalApiService.prototype[method])
      .mockRejectedValue(new NotFound("Perfil profissional indisponível."));
    const response = await request(app()).get(`/professional${path}`);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Perfil profissional indisponível." });
  });

  it.each([
    ["/services", "publicServices"], ["/faqs", "publicFaqs"],
  ] as const)("returns 200 with an empty published list at %s", async (path, method) => {
    jest.mocked(ProfessionalApiService.prototype[method]).mockResolvedValue([]);
    const response = await request(app()).get(`/professional${path}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: [] });
  });

  it("rejects a token with the wrong signature", async () => {
    const bad = jwt.sign({ id: 101, authVersion: 0 }, "wrong-test-secret");
    expect((await request(app()).get("/admin/professional/profile")
      .set("Authorization", `Bearer ${bad}`)).status).toBe(401);
  });

  it("rejects expired tokens", async () => {
    expect((await request(app()).get("/admin/professional/profile")
      .set("Authorization", `Bearer ${token(101, {}, { expiresIn: -1 })}`)).status).toBe(401);
  });

  it("rejects revoked tokens", async () => {
    users.get(101)!.authVersion = 1;
    expect((await request(app()).get("/admin/professional/profile")
      .set("Authorization", `Bearer ${token()}`)).status).toBe(401);
  });

  it("uses the current database role after demotion", async () => {
    users.get(101)!.role = "user";
    expect((await request(app()).get("/admin/professional/profile")
      .set("Authorization", `Bearer ${token()}`)).status).toBe(403);
  });

  it("rejects missing accounts", async () => {
    users.delete(101);
    expect((await request(app()).get("/admin/professional/profile")
      .set("Authorization", `Bearer ${token()}`)).status).toBe(401);
  });

  it("does not accept identity from headers or request body", async () => {
    expect((await request(app()).patch("/admin/professional/profile")
      .set("Authorization", `Bearer ${token(102)}`)
      .set("X-User-Id", "101").send({ userId: 101, version: 1 })).status).toBe(403);
  });

  it("rejects invalid resource identifiers", async () => {
    expect((await request(app()).get("/admin/professional/services/1e2")
      .set("Authorization", `Bearer ${token()}`)).status).toBe(400);
  });

  it("maps version conflicts to 409", async () => {
    jest.mocked(ProfessionalApiService.prototype.patchProfile)
      .mockRejectedValue(new ProfessionalConflict("Recarregue os dados."));
    expect((await request(app()).patch("/admin/professional/profile")
      .set("Authorization", `Bearer ${token()}`).send({ version: 1 })).status).toBe(409);
  });

  it("never exposes SQL details", async () => {
    jest.mocked(ProfessionalApiService.prototype.adminProfile).mockRejectedValue(
      new QueryFailedError("SELECT confidential_sql", [], Object.assign(
        new Error("confidential_db_error"), { code: "XX000" }
      ))
    );
    const response = await request(app()).get("/admin/professional/profile")
      .set("Authorization", `Bearer ${token()}`);
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Erro interno do servidor." });
  });

  it("maps unique violations without returning database details", async () => {
    jest.mocked(ProfessionalApiService.prototype.createService).mockRejectedValue(
      new QueryFailedError("private SQL", [], Object.assign(new Error("private detail"), { code: "23505" }))
    );
    const response = await request(app()).post("/admin/professional/services")
      .set("Authorization", `Bearer ${token()}`).send({});
    expect(response.status).toBe(409);
    expect(JSON.stringify(response.body)).not.toContain("private");
  });

  it("public profile DTO protects legacy HTML, URLs and hidden nested prices", async () => {
    const fixture = profileFixture({
      introduction: '<script>bad()</script><p onclick="bad()">Apresentação.</p>',
      photoUrl: "javascript:bad()",
      services: [serviceFixture({ showPrice: false, bookingEnabled: true })],
    });
    jest.mocked(ProfessionalApiService.prototype.publicProfile)
      .mockResolvedValue(toPublicProfessionalProfileDto(fixture));
    const response = await request(app()).get("/professional/profile");
    expect(response.status).toBe(200);
    expect(response.body.data.introduction).toBe("<p>Apresentação.</p>");
    expect(response.body.data.photo).toBeNull();
    expect(response.body.data.services[0]).not.toHaveProperty("price");
    expect(response.body.data.services[0].bookingEnabled).toBe(false);
    expect(response.body.data).not.toHaveProperty("version");
  });

  it("does not expose booking or physical deletion endpoints", async () => {
    expect((await request(app()).post("/professional/bookings")).status).toBe(404);
    expect((await request(app()).post("/admin/professional/bookings")
      .set("Authorization", `Bearer ${token()}`)).status).toBe(404);
    expect((await request(app()).delete("/admin/professional/services/10")
      .set("Authorization", `Bearer ${token()}`)).status).toBe(404);
  });
});

jest.mock("../config/ormconfig", () => ({
  AppDataSource: {
    initialize: jest.fn(() => { throw new Error("Database initialization forbidden in unit tests."); }),
  },
}));

import { DataSource, EntityManager } from "typeorm";
import { ProfessionalProfile } from "../models/ProfessionalProfile";
import { ProfessionalService } from "../models/ProfessionalService";
import { ProfessionalFaq } from "../models/ProfessionalFaq";
import { ProfessionalApiService } from "../services/professional/ProfessionalService";
import { profileFixture, serviceFixture, faqFixture, professionalTestActor } from "./helpers/professionalFixtures";

function repository() {
  const builder = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  return {
    findOne: jest.fn(), find: jest.fn().mockResolvedValue([]),
    create: jest.fn((value: object) => value),
    save: jest.fn(async (value: object) => ({ ...value, id: 100, version: 1 })),
    createQueryBuilder: jest.fn(() => builder), builder,
  };
}

function harness() {
  const profiles = repository(), services = repository(), faqs = repository();
  profiles.findOne.mockResolvedValue(profileFixture());
  services.findOne.mockResolvedValue(serviceFixture());
  faqs.findOne.mockResolvedValue(faqFixture());
  const getRepository = jest.fn((model: unknown) => {
    if (model === ProfessionalProfile) return profiles;
    if (model === ProfessionalService) return services;
    if (model === ProfessionalFaq) return faqs;
    throw new Error("Unexpected repository.");
  });
  const manager = { getRepository } as unknown as EntityManager;
  const transaction = jest.fn(async (action: (manager: EntityManager) => Promise<unknown>) => action(manager));
  const store = { getRepository, transaction } as unknown as DataSource;
  return { api: new ProfessionalApiService(store), profiles, services, faqs, getRepository, transaction };
}

describe("professional API service (mock repositories only)", () => {
  const originalId = process.env.PROFESSIONAL_ADMIN_USER_ID;
  beforeEach(() => { process.env.PROFESSIONAL_ADMIN_USER_ID = String(professionalTestActor.id); });
  afterAll(() => {
    if (originalId === undefined) delete process.env.PROFESSIONAL_ADMIN_USER_ID;
    else process.env.PROFESSIONAL_ADMIN_USER_ID = originalId;
  });

  it.each(["publicProfile", "publicServices", "publicFaqs"] as const)(
    "hides unpublished parent in %s", async (method) => {
      const h = harness();
      h.profiles.findOne.mockResolvedValue(profileFixture({ isPublished: false }));
      await expect(h.api[method]()).rejects.toMatchObject({ status: 404 });
      expect(h.services.find).not.toHaveBeenCalled();
      expect(h.faqs.find).not.toHaveBeenCalled();
    }
  );

  it("hides an inactive author", async () => {
    const h = harness();
    const profile = profileFixture();
    profile.authorProfile.isActive = false;
    h.profiles.findOne.mockResolvedValue(profile);
    await expect(h.api.publicProfile()).rejects.toMatchObject({ status: 404 });
  });

  it("filters and orders public services and never exposes a hidden price", async () => {
    const h = harness();
    h.services.find.mockResolvedValue([
      serviceFixture({ id: 11, displayOrder: 5, showPrice: false }),
      serviceFixture({ id: 12, isArchived: true }),
      serviceFixture({ id: 13, isPublished: false }),
      serviceFixture({ id: 10, displayOrder: 0, bookingEnabled: true }),
    ]);
    const result = await h.api.publicServices();
    expect(result.map((item) => item.id)).toEqual([10, 11]);
    expect(result[1]).not.toHaveProperty("price");
    expect(result[0]).toMatchObject({ bookingEnabled: false });
    expect(result[0]).not.toHaveProperty("version");
    expect(h.services.find).toHaveBeenCalledWith(expect.objectContaining({
      where: { professionalProfile: { id: 1 }, isPublished: true, isArchived: false },
    }));
  });

  it("returns empty public lists for an available parent", async () => {
    const h = harness();
    await expect(h.api.publicServices()).resolves.toEqual([]);
    await expect(h.api.publicFaqs()).resolves.toEqual([]);
  });

  it("filters and orders FAQs", async () => {
    const h = harness();
    h.faqs.find.mockResolvedValue([
      faqFixture({ id: 2, displayOrder: 2 }),
      faqFixture({ id: 3, isPublished: false }),
      faqFixture({ id: 1, displayOrder: 0 }),
    ]);
    expect((await h.api.publicFaqs()).map((item) => item.id)).toEqual([1, 2]);
  });

  it("checks service policy before any repository access", async () => {
    const h = harness();
    await expect(h.api.adminProfile({ id: 999, role: "admin" })).rejects.toMatchObject({ status: 403 });
    expect(h.getRepository).not.toHaveBeenCalled();
  });

  it.each(["adminService", "adminFaq"] as const)(
    "scopes %s by the professional profile", async (method) => {
      const h = harness();
      const repo = method === "adminService" ? h.services : h.faqs;
      repo.findOne.mockResolvedValue(null);
      await expect(h.api[method](999, professionalTestActor)).rejects.toMatchObject({ status: 404 });
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 999, professionalProfile: { id: 1 } },
      });
    }
  );

  it("updates services with version and profile scope in the same atomic statement", async () => {
    const h = harness();
    await h.api.patchService(10, { version: 1, name: "Novo nome" }, professionalTestActor);
    expect(h.services.builder.where).toHaveBeenCalledWith("id = :id", { id: 10 });
    expect(h.services.builder.andWhere).toHaveBeenCalledWith("version = :version", { version: 1 });
    expect(h.services.builder.andWhere).toHaveBeenCalledWith(
      "professional_profile_id = :scopeId", { scopeId: 1 }
    );
    expect(h.services.builder.set).toHaveBeenCalledWith(expect.objectContaining({
      code: "FIRST_CONSULTATION_ONLINE", name: "Novo nome", price: "180.00",
      showPrice: true, version: expect.any(Function),
    }));
  });

  it("rejects stale versions without attempting an update", async () => {
    const h = harness();
    await expect(h.api.patchService(10, { version: 2, name: "Nome" }, professionalTestActor))
      .rejects.toMatchObject({ status: 409 });
    expect(h.services.builder.execute).not.toHaveBeenCalled();
  });

  it("rejects a concurrent update that affects zero rows", async () => {
    const h = harness();
    h.services.builder.execute.mockResolvedValue({ affected: 0 });
    await expect(h.api.patchService(10, { version: 1, name: "Nome" }, professionalTestActor))
      .rejects.toMatchObject({ status: 409 });
  });

  it("validates publication against the final profile even when publication was omitted", async () => {
    const h = harness();
    await expect(h.api.patchProfile({ version: 1, education: "<p></p>" }, professionalTestActor))
      .rejects.toMatchObject({ status: 400 });
    expect(h.profiles.builder.execute).not.toHaveBeenCalled();
  });

  it("controls publication timestamps on the server", async () => {
    const h = harness();
    await h.api.patchProfile({ version: 1, isPublished: false }, professionalTestActor);
    expect(h.profiles.builder.set).toHaveBeenCalledWith(expect.objectContaining({ publishedAt: null }));
    const draft = profileFixture({ isPublished: false, publishedAt: null });
    h.profiles.findOne.mockResolvedValue(draft);
    await h.api.patchProfile({ version: 1, isPublished: true }, professionalTestActor);
    expect(h.profiles.builder.set).toHaveBeenLastCalledWith(
      expect.objectContaining({ publishedAt: expect.any(Date) })
    );
  });

  it("creates service and FAQ records within the selected profile", async () => {
    const h = harness();
    await h.api.createService({
      code: "CUSTOM_SERVICE", name: "Novo serviço", modality: "ONLINE", showPrice: false,
    }, professionalTestActor);
    expect(h.services.create).toHaveBeenCalledWith(expect.objectContaining({
      professionalProfile: expect.objectContaining({ id: 1 }), bookingEnabled: false,
    }));
    await h.api.createFaq({ question: "Pergunta?", answer: "<p>Resposta.</p>" }, professionalTestActor);
    expect(h.faqs.create).toHaveBeenCalledWith(expect.objectContaining({
      professionalProfile: expect.objectContaining({ id: 1 }),
    }));
  });

  it("does not update FAQs that belong to another profile", async () => {
    const h = harness();
    h.faqs.findOne.mockResolvedValue(null);
    await expect(h.api.patchFaq(888, { version: 1, answer: "Resposta" }, professionalTestActor))
      .rejects.toMatchObject({ status: 404 });
    expect(h.faqs.builder.execute).not.toHaveBeenCalled();
  });
});

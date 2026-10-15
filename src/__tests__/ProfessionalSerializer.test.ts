import { AuthorProfile } from "../models/AuthorProfile";
import { ProfessionalFaq } from "../models/ProfessionalFaq";
import { ProfessionalProfile } from "../models/ProfessionalProfile";
import { ProfessionalService } from "../models/ProfessionalService";
import { ServiceModality } from "../models/enums/ServiceModality";
import {
  toAdminProfessionalProfileDto,
  toPublicProfessionalProfileDto,
  toPublicProfessionalServiceDto,
} from "../serializers/professionalSerializer";

function service(
  overrides: Partial<ProfessionalService> = {}
): ProfessionalService {
  return {
    id: 1,
    code: "FIRST_CONSULTATION_ONLINE",
    slug: "primeira-consulta-online",
    name: "Primeira consulta online",
    description: null,
    modality: ServiceModality.ONLINE,
    price: "180.00",
    currency: "BRL",
    showPrice: true,
    durationMinutes: null,
    isPublished: true,
    bookingEnabled: false,
    displayOrder: 0,
    isArchived: false,
    version: 1,
    createdAt: new Date("2026-10-09T12:00:00Z"),
    updatedAt: new Date("2026-10-09T12:00:00Z"),
    ...overrides,
  } as ProfessionalService;
}

function profile(
  overrides: Partial<ProfessionalProfile> = {}
): ProfessionalProfile {
  const authorProfile = {
    id: 1,
    displayName: "Juliana Lacerda Macedo",
    slug: "juliana-lacerda-macedo",
    headline: "Nutricionista",
    isActive: true,
    shortBio: null,
    avatarUrl: null,
  } as AuthorProfile;

  const faq = {
    id: 1,
    question: "Como funciona?",
    answer: "<p>Resposta.</p>",
    displayOrder: 0,
    isPublished: true,
    version: 1,
    createdAt: new Date("2026-10-09T12:00:00Z"),
    updatedAt: new Date("2026-10-09T12:00:00Z"),
  } as ProfessionalFaq;

  return {
    id: 1,
    authorProfile,
    slug: "juliana-lacerda-macedo",
    crn: "CRN-10/15292",
    institutionalPhrase: "Nutrição além do prato.",
    introduction: "<p>Apresentação.</p>",
    carePhilosophy: null,
    education: "<p>Formação.</p>",
    professionalJourney: null,
    onlineDescription: null,
    inPersonDescription: null,
    photoUrl: null,
    photoAlt: null,
    photoFocusX: null,
    photoFocusY: null,
    publicEmail: null,
    publicPhone: null,
    whatsappNumber: null,
    instagramUrl: null,
    contactInstructions: null,
    isPublished: true,
    publishedAt: new Date("2026-10-09T12:00:00Z"),
    version: 1,
    services: [service(), service({ id: 2, isPublished: false })],
    faqs: [faq, { ...faq, id: 2, isPublished: false } as ProfessionalFaq],
    createdAt: new Date("2026-10-09T12:00:00Z"),
    updatedAt: new Date("2026-10-09T12:00:00Z"),
    ...overrides,
  } as ProfessionalProfile;
}

describe("professional serializers", () => {
  it("omits hidden prices from the public DTO", () => {
    const dto = toPublicProfessionalServiceDto(
      service({ showPrice: false, price: "180.00" })
    );

    expect(dto).not.toHaveProperty("price");
  });

  it("returns authorized prices in the public DTO", () => {
    expect(toPublicProfessionalServiceDto(service())).toMatchObject({
      price: "180.00",
      currency: "BRL",
    });
  });

  it("returns null for a draft profile", () => {
    expect(
      toPublicProfessionalProfileDto(profile({ isPublished: false }))
    ).toBeNull();
  });

  it("filters unpublished and archived nested records", () => {
    const data = toPublicProfessionalProfileDto(
      profile({
        services: [
          service(),
          service({ id: 2, code: "HIDDEN", isPublished: false }),
          service({ id: 3, code: "ARCHIVED", isArchived: true }),
        ],
      })
    ) as Record<string, unknown>;

    expect(data.services).toHaveLength(1);
    expect(data.faqs).toHaveLength(1);
    expect(JSON.stringify(data)).not.toContain('"version"');
    expect(JSON.stringify(data)).not.toContain('"isPublished"');
  });

  it("keeps complete price and publication state in the admin DTO", () => {
    const data = toAdminProfessionalProfileDto(profile());
    expect(data.services[0]).toMatchObject({
      price: "180.00",
      showPrice: true,
      isPublished: true,
      version: 1,
    });
  });
});

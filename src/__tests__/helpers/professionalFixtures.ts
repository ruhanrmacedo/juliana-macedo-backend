import { AuthorProfile } from "../../models/AuthorProfile";
import { ProfessionalProfile } from "../../models/ProfessionalProfile";
import { ProfessionalService } from "../../models/ProfessionalService";
import { ProfessionalFaq } from "../../models/ProfessionalFaq";
import { ServiceModality } from "../../models/enums/ServiceModality";

export const professionalTestActor = { id: 101, role: "admin" };
const date = new Date("2026-10-09T12:00:00Z");

export function serviceFixture(overrides: Partial<ProfessionalService> = {}) {
  return Object.assign(new ProfessionalService(), {
    id: 10, code: "FIRST_CONSULTATION_ONLINE", slug: "consulta-online",
    name: "Consulta online", description: "<p>Atendimento.</p>",
    modality: ServiceModality.ONLINE, price: "180.00", currency: "BRL",
    showPrice: true, durationMinutes: 60, isPublished: true,
    bookingEnabled: false, displayOrder: 0, isArchived: false, version: 1,
    professionalProfile: { id: 1 }, createdAt: date, updatedAt: date,
  }, overrides);
}

export function faqFixture(overrides: Partial<ProfessionalFaq> = {}) {
  return Object.assign(new ProfessionalFaq(), {
    id: 20, question: "Como funciona?", answer: "<p>Atendimento individual.</p>",
    displayOrder: 0, isPublished: true, version: 1,
    professionalProfile: { id: 1 }, createdAt: date, updatedAt: date,
  }, overrides);
}

export function profileFixture(overrides: Partial<ProfessionalProfile> = {}) {
  return Object.assign(new ProfessionalProfile(), {
    id: 1, slug: "juliana-lacerda-macedo", crn: "CRN-10/15292",
    authorProfile: Object.assign(new AuthorProfile(), {
      id: 2, slug: "juliana-lacerda-macedo", displayName: "Juliana Lacerda Macedo",
      headline: "Nutricionista", isActive: true,
    }),
    institutionalPhrase: "Nutrição possível.",
    introduction: "<p>Apresentação.</p>", education: "<p>Formação.</p>",
    isPublished: true, publishedAt: date, version: 1,
    createdAt: date, updatedAt: date,
    services: [serviceFixture()], faqs: [faqFixture()],
  }, overrides);
}

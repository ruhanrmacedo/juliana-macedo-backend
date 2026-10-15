import { BadRequest } from "../../models/anthropometry/calculators/utils/errors";
import { plainTextFromHtml } from "../../utils/editorial";
import {
  normalizeProfessionalFaqInput, normalizeProfessionalProfileInput,
  normalizeProfessionalServiceInput, sanitizeProfessionalHtml,
} from "../../utils/professionalContent";
import { ProfessionalProfile } from "../../models/ProfessionalProfile";
import { ProfessionalService } from "../../models/ProfessionalService";
import { ProfessionalFaq } from "../../models/ProfessionalFaq";

const PROFILE_FIELDS = [
  "slug", "crn", "institutionalPhrase", "introduction", "carePhilosophy",
  "education", "professionalJourney", "onlineDescription", "inPersonDescription",
  "photoUrl", "photoAlt", "photoFocusX", "photoFocusY", "publicEmail",
  "publicPhone", "whatsappNumber", "instagramUrl", "contactInstructions",
  "isPublished",
] as const;
const SERVICE_FIELDS = [
  "code", "slug", "name", "description", "modality", "price", "currency",
  "showPrice", "durationMinutes", "isPublished", "bookingEnabled", "displayOrder",
  "isArchived",
] as const;
const FAQ_FIELDS = ["question", "answer", "displayOrder", "isPublished"] as const;

function body(input: unknown, fields: readonly string[], patch: boolean) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new BadRequest("Corpo JSON inválido.");
  }
  const allowed = new Set([...fields, ...(patch ? ["version"] : [])]);
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!allowed.has(key) || value === undefined) {
      throw new BadRequest("Campo não permitido ou inválido.");
    }
    result[key] = value;
  }
  if (!Object.keys(result).some((key) => key !== "version")) {
    throw new BadRequest("Informe ao menos um campo editável.");
  }
  for (const key of ["displayOrder", "durationMinutes", "photoFocusX", "photoFocusY"]) {
    if (result[key] === undefined) continue;
    if (result[key] === null && key !== "displayOrder") continue;
    if (typeof result[key] !== "number" || !Number.isSafeInteger(result[key])) {
      throw new BadRequest("Campo numérico inválido.");
    }
  }
  if (patch) requiredVersion(result.version);
  return result;
}

export function requiredVersion(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new BadRequest("Informe uma versão inteira positiva.");
  }
  return value;
}

function editableSnapshot(entity: object, fields: readonly string[]) {
  const snapshot: Record<string, unknown> = {};
  for (const field of fields) {
    snapshot[field] = (entity as Record<string, unknown>)[field];
  }
  return snapshot;
}

export function profilePatch(input: unknown) {
  const requested = body(input, PROFILE_FIELDS, true);
  const normalized = normalizeProfessionalProfileInput(requested);
  delete normalized.version;
  return { version: requiredVersion(requested.version), fields: normalized };
}

export function serviceInput(input: unknown, existing?: ProfessionalService) {
  const requested = body(input, SERVICE_FIELDS, Boolean(existing));
  if (requested.bookingEnabled !== undefined && requested.bookingEnabled !== false) {
    throw new BadRequest("Agendamento indisponível nesta etapa.");
  }
  if (existing && requested.code !== undefined && requested.code !== existing.code) {
    throw new BadRequest("O código estável do serviço não pode ser alterado.");
  }
  const merged = {
    ...(existing ? editableSnapshot(existing, SERVICE_FIELDS) : {}),
    ...requested,
    bookingEnabled: false,
  };
  const normalized = normalizeProfessionalServiceInput(
    merged, { existingCode: existing?.code }
  );
  const { version: _unused, ...fields } = normalized;
  return {
    version: existing ? requiredVersion(requested.version) : undefined,
    fields,
  };
}

export function faqInput(input: unknown, existing?: ProfessionalFaq) {
  const requested = body(input, FAQ_FIELDS, Boolean(existing));
  const normalized = normalizeProfessionalFaqInput({
    ...(existing ? editableSnapshot(existing, FAQ_FIELDS) : {}),
    ...requested,
  });
  if (!plainTextFromHtml(normalized.answer)) {
    throw new BadRequest("A resposta deve conter conteúdo útil.");
  }
  // A question is plain text, unlike the sanitized HTML answer.
  normalized.question = plainTextFromHtml(normalized.question);
  if (!normalized.question) throw new BadRequest("Pergunta inválida.");
  const { version: _unused, ...fields } = normalized;
  return {
    version: existing ? requiredVersion(requested.version) : undefined,
    fields,
  };
}

export function assertUsefulPublishedProfile(profile: Partial<ProfessionalProfile>) {
  for (const value of [profile.introduction, profile.education]) {
    if (!plainTextFromHtml(sanitizeProfessionalHtml(value))) {
      throw new BadRequest("Apresentação e formação devem conter conteúdo útil para publicação.");
    }
  }
  if (!plainTextFromHtml(profile.institutionalPhrase ?? "")) {
    throw new BadRequest("A frase institucional deve conter conteúdo útil.");
  }
}

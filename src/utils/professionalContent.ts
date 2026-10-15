import sanitizeHtml from "sanitize-html";
import { BadRequest } from "../models/anthropometry/calculators/utils/errors";
import { ServiceModality } from "../models/enums/ServiceModality";
import {
  NormalizedProfessionalServiceInput,
  ProfessionalFaqInput,
  ProfessionalProfileInput,
  ProfessionalServiceInput,
} from "../types/professional";
import { normalizeSlug } from "./editorial";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164_REGEX = /^\+[1-9]\d{7,14}$/;
const SERVICE_CODE_REGEX = /^[A-Z][A-Z0-9_]{2,79}$/;
const MONEY_REGEX = /^\d{1,8}(?:\.\d{1,2})?$/;

export function sanitizeProfessionalHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value !== "string") {
    throw new BadRequest("Conteúdo profissional inválido.");
  }

  return sanitizeHtml(value, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "s",
      "h2",
      "h3",
      "h4",
      "ul",
      "ol",
      "li",
      "blockquote",
      "a",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
      }),
    },
  }).trim();
}

export function normalizeMoney(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value).trim();
  if (!MONEY_REGEX.test(raw)) {
    throw new BadRequest("Preço inválido. Use valor decimal positivo com até duas casas.");
  }

  const [integer, decimals = ""] = raw.split(".");
  return `${integer}.${decimals.padEnd(2, "0")}`;
}

export function normalizeProfessionalServiceInput(
  input: ProfessionalServiceInput,
  options: { existingCode?: string } = {}
): NormalizedProfessionalServiceInput {
  const name = requireTrimmedString(input.name, "Nome do serviço", 160);
  const requestedCode = requireTrimmedString(
    input.code ?? options.existingCode,
    "Código do serviço",
    80
  ).toUpperCase();

  if (!SERVICE_CODE_REGEX.test(requestedCode)) {
    throw new BadRequest(
      "Código do serviço inválido. Use letras maiúsculas, números e sublinhado."
    );
  }
  if (options.existingCode && requestedCode !== options.existingCode) {
    throw new BadRequest("O código estável do serviço não pode ser alterado.");
  }

  const slug = normalizeSlug(
    requireTrimmedString(input.slug ?? name, "Slug do serviço", 180)
  );
  if (!slug) throw new BadRequest("Slug do serviço inválido.");

  const modality = normalizeModality(input.modality);
  const price = normalizeMoney(input.price);
  const showPrice = normalizeBoolean(input.showPrice, false, "showPrice");
  if (showPrice && price === null) {
    throw new BadRequest("Um serviço com preço público precisa ter preço definido.");
  }

  const durationMinutes = normalizeNullablePositiveInteger(
    input.durationMinutes,
    "Duração"
  );
  const displayOrder = normalizeNonNegativeInteger(
    input.displayOrder,
    0,
    "Ordem de exibição"
  );
  const currency = requireTrimmedString(
    input.currency ?? "BRL",
    "Moeda",
    3
  ).toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new BadRequest("Moeda inválida.");
  }

  return {
    code: requestedCode,
    slug,
    name,
    description: normalizeNullableHtml(input.description),
    modality,
    price,
    currency,
    showPrice,
    durationMinutes,
    isPublished: normalizeBoolean(input.isPublished, false, "isPublished"),
    bookingEnabled: normalizeBoolean(
      input.bookingEnabled,
      false,
      "bookingEnabled"
    ),
    displayOrder,
    isArchived: normalizeBoolean(input.isArchived, false, "isArchived"),
    version: normalizeOptionalVersion(input.version),
  };
}

export function normalizeProfessionalProfileInput(
  input: ProfessionalProfileInput
) {
  const normalized: Record<string, unknown> = {};

  if (input.slug !== undefined) {
    const slug = normalizeSlug(requireTrimmedString(input.slug, "Slug", 180));
    if (!slug) throw new BadRequest("Slug do perfil inválido.");
    normalized.slug = slug;
  }
  if (input.crn !== undefined) {
    normalized.crn = requireTrimmedString(input.crn, "CRN", 40);
  }

  const htmlFields: Array<keyof ProfessionalProfileInput> = [
    "introduction",
    "carePhilosophy",
    "education",
    "professionalJourney",
    "onlineDescription",
    "inPersonDescription",
    "contactInstructions",
  ];
  for (const field of htmlFields) {
    if (input[field] !== undefined) {
      normalized[field] = normalizeNullableHtml(input[field]);
    }
  }

  if (input.institutionalPhrase !== undefined) {
    normalized.institutionalPhrase = normalizeNullablePlainText(
      input.institutionalPhrase,
      "Frase institucional",
      600
    );
  }
  if (input.photoUrl !== undefined) {
    normalized.photoUrl = normalizeNullableUrl(input.photoUrl, "URL da fotografia");
  }
  if (input.photoAlt !== undefined) {
    normalized.photoAlt = normalizeNullablePlainText(
      input.photoAlt,
      "Texto alternativo",
      220
    );
  }
  if (input.photoFocusX !== undefined) {
    normalized.photoFocusX = normalizeNullablePercentage(
      input.photoFocusX,
      "Foco horizontal"
    );
  }
  if (input.photoFocusY !== undefined) {
    normalized.photoFocusY = normalizeNullablePercentage(
      input.photoFocusY,
      "Foco vertical"
    );
  }
  if (input.publicEmail !== undefined) {
    const email = normalizeNullablePlainText(
      input.publicEmail,
      "E-mail público",
      320
    );
    if (email && !EMAIL_REGEX.test(email)) {
      throw new BadRequest("E-mail público inválido.");
    }
    normalized.publicEmail = email?.toLowerCase() ?? null;
  }
  if (input.publicPhone !== undefined) {
    normalized.publicPhone = normalizeNullablePlainText(
      input.publicPhone,
      "Telefone público",
      40
    );
  }
  if (input.whatsappNumber !== undefined) {
    const whatsapp = normalizeNullablePlainText(
      input.whatsappNumber,
      "WhatsApp",
      20
    );
    if (whatsapp && !E164_REGEX.test(whatsapp)) {
      throw new BadRequest(
        "WhatsApp inválido. Use formato internacional, por exemplo +5547999999999."
      );
    }
    normalized.whatsappNumber = whatsapp;
  }
  if (input.instagramUrl !== undefined) {
    normalized.instagramUrl = normalizeNullableUrl(
      input.instagramUrl,
      "URL do Instagram"
    );
  }
  if (input.isPublished !== undefined) {
    normalized.isPublished = normalizeBoolean(
      input.isPublished,
      false,
      "isPublished"
    );
  }
  if (input.version !== undefined) {
    normalized.version = normalizeOptionalVersion(input.version);
  }

  return normalized;
}

export function normalizeProfessionalFaqInput(input: ProfessionalFaqInput) {
  return {
    question: requireTrimmedString(input.question, "Pergunta", 300),
    answer: sanitizeProfessionalHtml(input.answer),
    displayOrder: normalizeNonNegativeInteger(
      input.displayOrder,
      0,
      "Ordem de exibição"
    ),
    isPublished: normalizeBoolean(input.isPublished, false, "isPublished"),
    version: normalizeOptionalVersion(input.version),
  };
}

export function assertProfessionalProfilePublishable(input: {
  crn?: string | null;
  institutionalPhrase?: string | null;
  introduction?: string | null;
  education?: string | null;
}) {
  const missing: string[] = [];
  if (!input.crn?.trim()) missing.push("CRN");
  if (!input.institutionalPhrase?.trim()) missing.push("frase institucional");
  if (!input.introduction?.trim()) missing.push("apresentação");
  if (!input.education?.trim()) missing.push("formação");

  if (missing.length) {
    throw new BadRequest(
      `Perfil incompleto para publicação: ${missing.join(", ")}.`
    );
  }
}

function normalizeModality(value: unknown): ServiceModality {
  if (
    value === ServiceModality.ONLINE ||
    value === ServiceModality.IN_PERSON
  ) {
    return value;
  }
  throw new BadRequest("Modalidade inválida.");
}

function normalizeNullableHtml(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const sanitized = sanitizeProfessionalHtml(value);
  return sanitized || null;
}

function normalizeNullableUrl(value: unknown, label: string): string | null {
  const text = normalizeNullablePlainText(value, label, 2048);
  if (!text) return null;
  try {
    const url = new URL(text);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    return url.toString();
  } catch {
    throw new BadRequest(`${label} inválida.`);
  }
}

function normalizeNullablePlainText(
  value: unknown,
  label: string,
  maxLength: number
): string | null {
  if (value === null || value === undefined || value === "") return null;
  return requireTrimmedString(value, label, maxLength);
}

function requireTrimmedString(
  value: unknown,
  label: string,
  maxLength: number
): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new BadRequest(`${label} é obrigatório.`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new BadRequest(`${label} excede o limite de ${maxLength} caracteres.`);
  }
  return normalized;
}

function normalizeBoolean(
  value: unknown,
  defaultValue: boolean,
  field: string
): boolean {
  if (value === undefined) return defaultValue;
  if (typeof value !== "boolean") {
    throw new BadRequest(`${field} deve ser booleano.`);
  }
  return value;
}

function normalizeNullablePositiveInteger(
  value: unknown,
  label: string
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new BadRequest(`${label} deve ser um número inteiro positivo.`);
  }
  return number;
}

function normalizeNonNegativeInteger(
  value: unknown,
  defaultValue: number,
  label: string
): number {
  if (value === undefined || value === "") return defaultValue;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw new BadRequest(`${label} deve ser um número inteiro não negativo.`);
  }
  return number;
}

function normalizeNullablePercentage(
  value: unknown,
  label: string
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 100) {
    throw new BadRequest(`${label} deve estar entre 0 e 100.`);
  }
  return number;
}

function normalizeOptionalVersion(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new BadRequest("Versão inválida.");
  }
  return number;
}

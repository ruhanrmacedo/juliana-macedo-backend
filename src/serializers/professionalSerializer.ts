import { ProfessionalFaq } from "../models/ProfessionalFaq";
import { ProfessionalProfile } from "../models/ProfessionalProfile";
import { ProfessionalService } from "../models/ProfessionalService";
import { sanitizeProfessionalHtml } from "../utils/professionalContent";

function publicHtml(value?: string | null) {
  return value ? sanitizeProfessionalHtml(value) || null : null;
}

function publicUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

export function toPublicProfessionalServiceDto(service: ProfessionalService) {
  const dto: Record<string, unknown> = {
    id: service.id,
    code: service.code,
    slug: service.slug,
    name: service.name,
    description: publicHtml(service.description),
    modality: service.modality,
    durationMinutes: service.durationMinutes ?? null,
    currency: service.currency,
    // Booking is intentionally disabled in this phase, including legacy rows.
    bookingEnabled: false,
    displayOrder: service.displayOrder,
  };

  if (service.showPrice && service.price !== null && service.price !== undefined) {
    dto.price = service.price;
  }

  return dto;
}

export function toAdminProfessionalServiceDto(service: ProfessionalService) {
  return {
    id: service.id,
    code: service.code,
    slug: service.slug,
    name: service.name,
    description: service.description ?? null,
    modality: service.modality,
    price: service.price ?? null,
    currency: service.currency,
    showPrice: service.showPrice,
    durationMinutes: service.durationMinutes ?? null,
    isPublished: service.isPublished,
    bookingEnabled: service.bookingEnabled,
    displayOrder: service.displayOrder,
    isArchived: service.isArchived,
    version: service.version,
    createdAt: service.createdAt,
    updatedAt: service.updatedAt,
  };
}

export function toPublicProfessionalFaqDto(faq: ProfessionalFaq) {
  return {
    id: faq.id,
    question: faq.question,
    answer: sanitizeProfessionalHtml(faq.answer),
    displayOrder: faq.displayOrder,
  };
}

export function toAdminProfessionalFaqDto(faq: ProfessionalFaq) {
  return {
    ...toPublicProfessionalFaqDto(faq),
    isPublished: faq.isPublished,
    version: faq.version,
    createdAt: faq.createdAt,
    updatedAt: faq.updatedAt,
  };
}

export function toPublicProfessionalProfileDto(
  profile: ProfessionalProfile
): Record<string, unknown> | null {
  if (!profile.isPublished || !profile.authorProfile?.isActive) return null;

  const services = (profile.services ?? [])
    .filter((service) => service.isPublished && !service.isArchived)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id)
    .map(toPublicProfessionalServiceDto);

  const faqs = (profile.faqs ?? [])
    .filter((faq) => faq.isPublished)
    .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id)
    .map(toPublicProfessionalFaqDto);

  return {
    id: profile.id,
    slug: profile.slug,
    displayName: profile.authorProfile.displayName,
    headline: profile.authorProfile.headline,
    shortBio: profile.authorProfile.shortBio ?? null,
    crn: profile.crn,
    institutionalPhrase: profile.institutionalPhrase ?? null,
    introduction: publicHtml(profile.introduction),
    carePhilosophy: publicHtml(profile.carePhilosophy),
    education: publicHtml(profile.education),
    professionalJourney: publicHtml(profile.professionalJourney),
    modalities: {
      online: publicHtml(profile.onlineDescription),
      inPerson: publicHtml(profile.inPersonDescription),
    },
    photo: publicUrl(profile.photoUrl)
      ? {
          url: publicUrl(profile.photoUrl),
          alt: profile.photoAlt ?? profile.authorProfile.displayName,
          focusX: profile.photoFocusX ?? 50,
          focusY: profile.photoFocusY ?? 50,
        }
      : null,
    contacts: {
      email: profile.publicEmail ?? null,
      phone: profile.publicPhone ?? null,
      whatsapp: profile.whatsappNumber ?? null,
      instagramUrl: publicUrl(profile.instagramUrl),
      instructions: publicHtml(profile.contactInstructions),
    },
    services,
    faqs,
    publishedAt: profile.publishedAt ?? null,
    updatedAt: profile.updatedAt,
  };
}

export function toAdminProfessionalProfileDto(profile: ProfessionalProfile) {
  return {
    id: profile.id,
    authorProfile: {
      id: profile.authorProfile.id,
      displayName: profile.authorProfile.displayName,
      slug: profile.authorProfile.slug,
      headline: profile.authorProfile.headline,
      shortBio: profile.authorProfile.shortBio ?? null,
      avatarUrl: profile.authorProfile.avatarUrl ?? null,
    },
    slug: profile.slug,
    crn: profile.crn,
    institutionalPhrase: profile.institutionalPhrase ?? null,
    introduction: profile.introduction ?? null,
    carePhilosophy: profile.carePhilosophy ?? null,
    education: profile.education ?? null,
    professionalJourney: profile.professionalJourney ?? null,
    onlineDescription: profile.onlineDescription ?? null,
    inPersonDescription: profile.inPersonDescription ?? null,
    photoUrl: profile.photoUrl ?? null,
    photoAlt: profile.photoAlt ?? null,
    photoFocusX: profile.photoFocusX ?? null,
    photoFocusY: profile.photoFocusY ?? null,
    publicEmail: profile.publicEmail ?? null,
    publicPhone: profile.publicPhone ?? null,
    whatsappNumber: profile.whatsappNumber ?? null,
    instagramUrl: profile.instagramUrl ?? null,
    contactInstructions: profile.contactInstructions ?? null,
    isPublished: profile.isPublished,
    publishedAt: profile.publishedAt ?? null,
    version: profile.version,
    services: [...(profile.services ?? [])]
      .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id)
      .map(toAdminProfessionalServiceDto),
    faqs: [...(profile.faqs ?? [])]
      .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id)
      .map(toAdminProfessionalFaqDto),
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

import { ServiceModality } from "../models/enums/ServiceModality";

export type ProfessionalProfileInput = {
  slug?: unknown;
  crn?: unknown;
  institutionalPhrase?: unknown;
  introduction?: unknown;
  carePhilosophy?: unknown;
  education?: unknown;
  professionalJourney?: unknown;
  onlineDescription?: unknown;
  inPersonDescription?: unknown;
  photoUrl?: unknown;
  photoAlt?: unknown;
  photoFocusX?: unknown;
  photoFocusY?: unknown;
  publicEmail?: unknown;
  publicPhone?: unknown;
  whatsappNumber?: unknown;
  instagramUrl?: unknown;
  contactInstructions?: unknown;
  isPublished?: unknown;
  version?: unknown;
};

export type ProfessionalServiceInput = {
  code?: unknown;
  slug?: unknown;
  name?: unknown;
  description?: unknown;
  modality?: unknown;
  price?: unknown;
  currency?: unknown;
  showPrice?: unknown;
  durationMinutes?: unknown;
  isPublished?: unknown;
  bookingEnabled?: unknown;
  displayOrder?: unknown;
  isArchived?: unknown;
  version?: unknown;
};

export type ProfessionalFaqInput = {
  question?: unknown;
  answer?: unknown;
  displayOrder?: unknown;
  isPublished?: unknown;
  version?: unknown;
};

export type NormalizedProfessionalServiceInput = {
  code: string;
  slug: string;
  name: string;
  description: string | null;
  modality: ServiceModality;
  price: string | null;
  currency: string;
  showPrice: boolean;
  durationMinutes: number | null;
  isPublished: boolean;
  bookingEnabled: boolean;
  displayOrder: number;
  isArchived: boolean;
  version?: number;
};

import { BadRequest } from "../models/anthropometry/calculators/utils/errors";
import { ServiceModality } from "../models/enums/ServiceModality";
import {
  assertProfessionalProfilePublishable,
  normalizeMoney,
  normalizeProfessionalFaqInput,
  normalizeProfessionalProfileInput,
  normalizeProfessionalServiceInput,
  sanitizeProfessionalHtml,
} from "../utils/professionalContent";

describe("professional content validation", () => {
  it("normalizes decimal prices without floating-point conversion", () => {
    expect(normalizeMoney("180")).toBe("180.00");
    expect(normalizeMoney("120.5")).toBe("120.50");
    expect(normalizeMoney(null)).toBeNull();
    expect(() => normalizeMoney("-1")).toThrow(BadRequest);
    expect(() => normalizeMoney("10.999")).toThrow(BadRequest);
  });

  it("requires a defined price when price visibility is enabled", () => {
    expect(() =>
      normalizeProfessionalServiceInput({
        code: "FIRST_CONSULTATION_ONLINE",
        name: "Primeira consulta online",
        modality: ServiceModality.ONLINE,
        price: null,
        showPrice: true,
      })
    ).toThrow("Um serviço com preço público precisa ter preço definido.");
  });

  it("keeps the stable code immutable", () => {
    expect(() =>
      normalizeProfessionalServiceInput(
        {
          code: "CHANGED_CODE",
          name: "Primeira consulta online",
          modality: ServiceModality.ONLINE,
        },
        { existingCode: "FIRST_CONSULTATION_ONLINE" }
      )
    ).toThrow("O código estável do serviço não pode ser alterado.");
  });

  it("normalizes a valid draft service", () => {
    expect(
      normalizeProfessionalServiceInput({
        code: "FIRST_CONSULTATION_ONLINE",
        name: " Primeira consulta online ",
        modality: ServiceModality.ONLINE,
        price: "180.00",
        showPrice: true,
        durationMinutes: null,
      })
    ).toMatchObject({
      code: "FIRST_CONSULTATION_ONLINE",
      slug: "primeira-consulta-online",
      name: "Primeira consulta online",
      modality: ServiceModality.ONLINE,
      price: "180.00",
      showPrice: true,
      durationMinutes: null,
      isPublished: false,
      bookingEnabled: false,
    });
  });

  it("sanitizes professional text with a stricter allowlist", () => {
    const sanitized = sanitizeProfessionalHtml(
      '<p style="color:red" onclick="alert(1)">Texto <strong>válido</strong></p>' +
        '<script>alert(2)</script><img src="https://example.com/a.jpg">'
    );

    expect(sanitized).toBe("<p>Texto <strong>válido</strong></p>");
    expect(sanitized).not.toContain("onclick");
    expect(sanitized).not.toContain("style");
    expect(sanitized).not.toContain("<img");
    expect(sanitized).not.toContain("<script");
  });

  it("validates public contacts and photo focus", () => {
    expect(
      normalizeProfessionalProfileInput({
        publicEmail: " JULIANA@EXAMPLE.COM ",
        whatsappNumber: "+5547999999999",
        photoFocusX: 50,
        photoFocusY: 25,
      })
    ).toEqual({
      publicEmail: "juliana@example.com",
      whatsappNumber: "+5547999999999",
      photoFocusX: 50,
      photoFocusY: 25,
    });

    expect(() =>
      normalizeProfessionalProfileInput({ whatsappNumber: "47999999999" })
    ).toThrow(BadRequest);
    expect(() =>
      normalizeProfessionalProfileInput({ photoFocusX: 101 })
    ).toThrow(BadRequest);
  });

  it("requires approved core content before publication", () => {
    expect(() =>
      assertProfessionalProfilePublishable({
        crn: "CRN-10/15292",
        institutionalPhrase: "Frase",
        introduction: null,
        education: null,
      })
    ).toThrow("Perfil incompleto para publicação");

    expect(() =>
      assertProfessionalProfilePublishable({
        crn: "CRN-10/15292",
        institutionalPhrase: "Frase",
        introduction: "<p>Apresentação</p>",
        education: "<p>Formação</p>",
      })
    ).not.toThrow();
  });

  it("validates FAQs without allowing unsafe markup", () => {
    expect(
      normalizeProfessionalFaqInput({
        question: " Como funciona? ",
        answer: '<p>Resposta</p><iframe src="https://example.com"></iframe>',
        isPublished: false,
      })
    ).toEqual({
      question: "Como funciona?",
      answer: "<p>Resposta</p>",
      displayOrder: 0,
      isPublished: false,
      version: undefined,
    });
  });
});

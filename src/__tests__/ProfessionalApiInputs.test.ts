import {
  assertUsefulPublishedProfile, faqInput, profilePatch, serviceInput,
} from "../services/professional/ProfessionalInputs";
import { profileFixture, serviceFixture, faqFixture } from "./helpers/professionalFixtures";

describe("professional API input boundaries (no database)", () => {
  it.each(["id", "authorProfile", "publishedAt", "createdAt", "services", "role"])(
    "rejects mass assignment of profile %s", (field) => {
      expect(() => profilePatch({ version: 1, introduction: "<p>Texto.</p>", [field]: 42 }))
        .toThrow("Campo não permitido");
    }
  );

  it.each([undefined, null, "1", 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])(
    "requires a safe numeric version in PATCH: %s", (version) => {
      expect(() => profilePatch({ version, institutionalPhrase: "Nova frase" })).toThrow();
    }
  );

  it("rejects an empty PATCH", () => {
    expect(() => profilePatch({ version: 1 })).toThrow("campo editável");
  });

  it("sanitizes profile changes without adding omitted fields", () => {
    expect(profilePatch({ version: 1, introduction: "<script>bad()</script><p>Olá.</p>" }))
      .toEqual({ version: 1, fields: { introduction: "<p>Olá.</p>" } });
  });

  it("preserves omitted service fields, including hidden price and publication state", () => {
    const current = serviceFixture({ showPrice: false, isPublished: false, isArchived: true });
    const result = serviceInput({ version: 1, name: "Novo nome" }, current);
    expect(result.fields).toMatchObject({
      code: current.code, slug: current.slug, name: "Novo nome", price: "180.00",
      showPrice: false, isPublished: false, isArchived: true, displayOrder: 0,
      bookingEnabled: false,
    });
  });

  it("keeps service code immutable", () => {
    expect(() => serviceInput({ version: 1, code: "REPLACED_CODE" }, serviceFixture()))
      .toThrow("não pode ser alterado");
  });

  it("rejects changing a visible price to null", () => {
    expect(() => serviceInput({ version: 1, price: null }, serviceFixture()))
      .toThrow("preço público");
  });

  it("allows clearing a price when it is hidden in the final state", () => {
    expect(serviceInput({ version: 1, price: null, showPrice: false }, serviceFixture()).fields)
      .toMatchObject({ price: null, showPrice: false });
  });

  it("rejects booking enablement", () => {
    expect(() => serviceInput({ version: 1, bookingEnabled: true }, serviceFixture()))
      .toThrow("Agendamento indisponível");
  });

  it("rejects creation with client-supplied version or relationship", () => {
    expect(() => serviceInput({ name: "Consulta", version: 1 })).toThrow("Campo não permitido");
    expect(() => faqInput({ question: "Pergunta", answer: "Resposta", professionalProfile: 2 }))
      .toThrow("Campo não permitido");
  });

  it("preserves omitted FAQ fields", () => {
    expect(faqInput({ version: 1, displayOrder: 5 }, faqFixture()).fields)
      .toMatchObject({ question: "Como funciona?", isPublished: true, displayOrder: 5 });
  });

  it.each(["", "<p> </p>", "<script>bad()</script>", "<p>&nbsp;</p>"])(
    "rejects FAQ answers without useful content: %s", (answer) => {
      expect(() => faqInput({ question: "Como funciona?", answer })).toThrow("conteúdo útil");
    }
  );

  it("sanitizes answer HTML and turns the question into plain text", () => {
    expect(faqInput({
      question: "<strong>Pergunta?</strong>",
      answer: '<p onclick="bad()">Resposta.</p><script>bad()</script>',
    }).fields).toMatchObject({ question: "Pergunta?", answer: "<p>Resposta.</p>" });
  });

  it("rejects published profile markup without useful presentation", () => {
    expect(() => assertUsefulPublishedProfile(profileFixture({ introduction: "<p></p>" })))
      .toThrow("conteúdo útil");
  });
});

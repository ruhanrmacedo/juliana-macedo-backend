import fs from "node:fs";
import path from "node:path";

describe("professional profile migration", () => {
  const migration = fs.readFileSync(
    path.resolve(
      process.cwd(),
      "src/migrations/1791518400000-CreateProfessionalProfileAndServices.ts"
    ),
    "utf8"
  );

  it("creates only structural objects without inserting initial data", () => {
    expect(migration).toContain('CREATE TABLE "professional_profiles"');
    expect(migration).toContain('CREATE TABLE "professional_services"');
    expect(migration).toContain('CREATE TABLE "professional_faqs"');
    expect(migration).not.toMatch(/\bINSERT\s+INTO\b/i);
  });

  it("uses decimal prices and independent publication controls", () => {
    expect(migration).toContain('"price" numeric(10,2)');
    expect(migration).toContain('"show_price" boolean');
    expect(migration).toContain('"is_published" boolean');
    expect(migration).toContain('"booking_enabled" boolean');
    expect(migration).toContain(
      '"show_price" = false OR "price" IS NOT NULL'
    );
  });

  it("preserves stable service codes and prevents physical cascade deletion", () => {
    expect(migration).toContain(
      'CONSTRAINT "UQ_professional_services_code" UNIQUE ("code")'
    );
    expect(migration).toContain(
      'REFERENCES "professional_profiles"("id") ON DELETE RESTRICT'
    );
  });
});

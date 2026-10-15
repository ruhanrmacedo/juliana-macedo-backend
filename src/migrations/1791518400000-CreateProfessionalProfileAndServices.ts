import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProfessionalProfileAndServices1791518400000
  implements MigrationInterface
{
  name = "CreateProfessionalProfileAndServices1791518400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "professional_profiles" (
        "id" SERIAL NOT NULL,
        "author_profile_id" integer NOT NULL,
        "slug" varchar(180) NOT NULL,
        "crn" varchar(40) NOT NULL,
        "institutional_phrase" text,
        "introduction" text,
        "care_philosophy" text,
        "education" text,
        "professional_journey" text,
        "online_description" text,
        "in_person_description" text,
        "photo_url" varchar,
        "photo_alt" varchar(220),
        "photo_focus_x" smallint,
        "photo_focus_y" smallint,
        "public_email" varchar(320),
        "public_phone" varchar(40),
        "whatsapp_number" varchar(20),
        "instagram_url" varchar,
        "contact_instructions" text,
        "is_published" boolean NOT NULL DEFAULT false,
        "published_at" timestamp,
        "version" integer NOT NULL DEFAULT 1,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_professional_profiles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_professional_profiles_author" UNIQUE ("author_profile_id"),
        CONSTRAINT "CHK_professional_profiles_photo_focus_x"
          CHECK ("photo_focus_x" IS NULL OR ("photo_focus_x" >= 0 AND "photo_focus_x" <= 100)),
        CONSTRAINT "CHK_professional_profiles_photo_focus_y"
          CHECK ("photo_focus_y" IS NULL OR ("photo_focus_y" >= 0 AND "photo_focus_y" <= 100)),
        CONSTRAINT "FK_professional_profiles_author"
          FOREIGN KEY ("author_profile_id") REFERENCES "author_profiles"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_professional_profiles_slug_lower" ON "professional_profiles" (LOWER("slug"))`
    );

    await queryRunner.query(`
      CREATE TABLE "professional_services" (
        "id" SERIAL NOT NULL,
        "professional_profile_id" integer NOT NULL,
        "code" varchar(80) NOT NULL,
        "slug" varchar(180) NOT NULL,
        "name" varchar(160) NOT NULL,
        "description" text,
        "modality" varchar(20) NOT NULL,
        "price" numeric(10,2),
        "currency" char(3) NOT NULL DEFAULT 'BRL',
        "show_price" boolean NOT NULL DEFAULT false,
        "duration_minutes" integer,
        "is_published" boolean NOT NULL DEFAULT false,
        "booking_enabled" boolean NOT NULL DEFAULT false,
        "display_order" integer NOT NULL DEFAULT 0,
        "is_archived" boolean NOT NULL DEFAULT false,
        "version" integer NOT NULL DEFAULT 1,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_professional_services" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_professional_services_code" UNIQUE ("code"),
        CONSTRAINT "CHK_professional_services_modality"
          CHECK ("modality" IN ('ONLINE', 'IN_PERSON')),
        CONSTRAINT "CHK_professional_services_price"
          CHECK ("price" IS NULL OR "price" >= 0),
        CONSTRAINT "CHK_professional_services_visible_price"
          CHECK ("show_price" = false OR "price" IS NOT NULL),
        CONSTRAINT "CHK_professional_services_duration"
          CHECK ("duration_minutes" IS NULL OR "duration_minutes" > 0),
        CONSTRAINT "CHK_professional_services_display_order"
          CHECK ("display_order" >= 0),
        CONSTRAINT "FK_professional_services_profile"
          FOREIGN KEY ("professional_profile_id") REFERENCES "professional_profiles"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_professional_services_slug_lower" ON "professional_services" (LOWER("slug"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_professional_services_public_order" ON "professional_services" ("professional_profile_id", "is_published", "is_archived", "display_order")`
    );

    await queryRunner.query(`
      CREATE TABLE "professional_faqs" (
        "id" SERIAL NOT NULL,
        "professional_profile_id" integer NOT NULL,
        "question" varchar(300) NOT NULL,
        "answer" text NOT NULL,
        "display_order" integer NOT NULL DEFAULT 0,
        "is_published" boolean NOT NULL DEFAULT false,
        "version" integer NOT NULL DEFAULT 1,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_professional_faqs" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_professional_faqs_display_order"
          CHECK ("display_order" >= 0),
        CONSTRAINT "FK_professional_faqs_profile"
          FOREIGN KEY ("professional_profile_id") REFERENCES "professional_profiles"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_professional_faqs_public_order" ON "professional_faqs" ("professional_profile_id", "is_published", "display_order")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "professional_faqs"`);
    await queryRunner.query(`DROP TABLE "professional_services"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_professional_profiles_slug_lower"`);
    await queryRunner.query(`DROP TABLE "professional_profiles"`);
  }
}

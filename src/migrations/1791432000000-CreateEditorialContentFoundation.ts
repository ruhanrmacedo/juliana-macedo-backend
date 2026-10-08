import { MigrationInterface, QueryRunner } from "typeorm";
import { buildExcerpt, normalizeSlug } from "../utils/editorial";

type LegacyPost = {
  id: number;
  title: string;
  content: string;
  postType: string;
  isActive: boolean;
  created_at: Date;
};

export class CreateEditorialContentFoundation1791432000000
  implements MigrationInterface
{
  name = "CreateEditorialContentFoundation1791432000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "author_profiles" (
        "id" SERIAL NOT NULL,
        "displayName" varchar(160) NOT NULL,
        "slug" varchar(180) NOT NULL,
        "headline" varchar(200) NOT NULL,
        "shortBio" text,
        "avatarUrl" varchar,
        "isActive" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_author_profiles" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_author_profiles_slug_lower" ON "author_profiles" (LOWER("slug"))`,
    );

    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" SERIAL NOT NULL,
        "name" varchar(100) NOT NULL,
        "slug" varchar(120) NOT NULL,
        "description" text,
        "isActive" boolean NOT NULL DEFAULT true,
        CONSTRAINT "PK_categories" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_categories_slug_lower" ON "categories" (LOWER("slug"))`,
    );

    await queryRunner.query(`
      CREATE TABLE "tags" (
        "id" SERIAL NOT NULL,
        "name" varchar(80) NOT NULL,
        "slug" varchar(100) NOT NULL,
        CONSTRAINT "PK_tags" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_tags_slug_lower" ON "tags" (LOWER("slug"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_tags_name_lower" ON "tags" (LOWER("name"))`,
    );

    const [juliana] = await queryRunner.query(`
      INSERT INTO "author_profiles" ("displayName", "slug", "headline")
      VALUES ('Juliana Lacerda Macedo', 'juliana-lacerda-macedo', 'Nutricionista • CRN-10 15292')
      RETURNING "id"
    `);

    const categoryRows: Array<{ id: number; slug: string }> =
      await queryRunner.query(`
        INSERT INTO "categories" ("name", "slug") VALUES
          ('Alimentação', 'alimentacao'),
          ('Saúde', 'saude'),
          ('Comportamento alimentar', 'comportamento-alimentar'),
          ('Saúde mental', 'saude-mental'),
          ('Rotina', 'rotina')
        RETURNING "id", "slug"
      `);
    const categoryIds = new Map(categoryRows.map((row) => [row.slug, row.id]));

    await queryRunner.query(`
      ALTER TABLE "posts"
        ADD COLUMN "slug" varchar(220),
        ADD COLUMN "excerpt" text,
        ADD COLUMN "channel" varchar(20),
        ADD COLUMN "format" varchar(20),
        ADD COLUMN "status" varchar(20),
        ADD COLUMN "publishedAt" timestamp,
        ADD COLUMN "categoryId" integer,
        ADD COLUMN "authorProfileId" integer,
        ADD COLUMN "imageAlt" varchar,
        ADD COLUMN "imageCaption" text,
        ADD COLUMN "imageCredit" varchar,
        ADD COLUMN "seoTitle" varchar,
        ADD COLUMN "seoDescription" text,
        ADD COLUMN "isFeatured" boolean NOT NULL DEFAULT false,
        ADD COLUMN "featuredPriority" smallint
    `);

    const posts: LegacyPost[] = await queryRunner.query(`
      SELECT "id", "title", "content", "postType", "isActive", "created_at"
      FROM "posts"
      ORDER BY "id"
    `);
    const usedSlugs = new Set<string>();

    for (const post of posts) {
      const baseSlug = normalizeSlug(post.title) || `conteudo-${post.id}`;
      const slug = usedSlugs.has(baseSlug) ? `${baseSlug}-${post.id}` : baseSlug;
      usedSlugs.add(slug);

      const format = post.postType === "Receita" ? "RECIPE" : "ARTICLE";
      const status = post.isActive ? "PUBLISHED" : "ARCHIVED";
      const categoryId =
        post.postType === "Saúde"
          ? categoryIds.get("saude")
          : post.postType === "Alimentação" || post.postType === "Receita"
            ? categoryIds.get("alimentacao")
            : null;

      await queryRunner.query(
        `
          UPDATE "posts"
          SET "slug" = $1,
              "excerpt" = $2,
              "channel" = 'CONTENT',
              "format" = $3,
              "status" = $4,
              "publishedAt" = $5,
              "categoryId" = $6,
              "authorProfileId" = $7
          WHERE "id" = $8
        `,
        [
          slug,
          buildExcerpt(post.content),
          format,
          status,
          post.isActive ? post.created_at : null,
          categoryId,
          juliana.id,
          post.id,
        ],
      );
    }

    await queryRunner.query(`
      ALTER TABLE "posts"
        ALTER COLUMN "slug" SET NOT NULL,
        ALTER COLUMN "excerpt" SET NOT NULL,
        ALTER COLUMN "channel" SET NOT NULL,
        ALTER COLUMN "format" SET NOT NULL,
        ALTER COLUMN "status" SET NOT NULL,
        ALTER COLUMN "authorProfileId" SET NOT NULL
    `);
    await queryRunner.query(
      `ALTER TABLE "posts" ALTER COLUMN "authorProfileId" SET DEFAULT ${Number(juliana.id)}`,
    );

    await queryRunner.query(`
      ALTER TABLE "posts"
        ADD CONSTRAINT "CHK_posts_channel" CHECK ("channel" IN ('CONTENT', 'BLOG')),
        ADD CONSTRAINT "CHK_posts_format" CHECK ("format" IN ('ARTICLE', 'RECIPE')),
        ADD CONSTRAINT "CHK_posts_status" CHECK ("status" IN ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED')),
        ADD CONSTRAINT "CHK_posts_featured_priority" CHECK ("featuredPriority" IS NULL OR "featuredPriority" >= 0),
        ADD CONSTRAINT "FK_posts_category" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL,
        ADD CONSTRAINT "FK_posts_author_profile" FOREIGN KEY ("authorProfileId") REFERENCES "author_profiles"("id") ON DELETE RESTRICT
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_posts_slug_lower" ON "posts" (LOWER("slug"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_posts_status_published" ON "posts" ("status", "publishedAt" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_posts_channel_status_published" ON "posts" ("channel", "status", "publishedAt" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_posts_format_status_published" ON "posts" ("format", "status", "publishedAt" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_posts_category_status_published" ON "posts" ("categoryId", "status", "publishedAt" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_posts_featured" ON "posts" ("isFeatured", "featuredPriority") WHERE "isFeatured" = true`,
    );

    await queryRunner.query(`
      CREATE TABLE "post_tags" (
        "postId" integer NOT NULL,
        "tagId" integer NOT NULL,
        CONSTRAINT "PK_post_tags" PRIMARY KEY ("postId", "tagId"),
        CONSTRAINT "FK_post_tags_post" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_post_tags_tag" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_post_tags_tag" ON "post_tags" ("tagId")`);

    await queryRunner.query(`
      CREATE TABLE "post_slug_redirects" (
        "id" SERIAL NOT NULL,
        "oldSlug" varchar(220) NOT NULL,
        "postId" integer NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "PK_post_slug_redirects" PRIMARY KEY ("id"),
        CONSTRAINT "FK_post_slug_redirects_post" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_post_slug_redirects_old_slug_lower" ON "post_slug_redirects" (LOWER("oldSlug"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "post_slug_redirects"`);
    await queryRunner.query(`DROP TABLE "post_tags"`);
    await queryRunner.query(`DROP INDEX "IDX_posts_featured"`);
    await queryRunner.query(`DROP INDEX "IDX_posts_category_status_published"`);
    await queryRunner.query(`DROP INDEX "IDX_posts_format_status_published"`);
    await queryRunner.query(`DROP INDEX "IDX_posts_channel_status_published"`);
    await queryRunner.query(`DROP INDEX "IDX_posts_status_published"`);
    await queryRunner.query(`DROP INDEX "UQ_posts_slug_lower"`);
    await queryRunner.query(`
      ALTER TABLE "posts"
        DROP CONSTRAINT "FK_posts_author_profile",
        DROP CONSTRAINT "FK_posts_category",
        DROP CONSTRAINT "CHK_posts_featured_priority",
        DROP CONSTRAINT "CHK_posts_status",
        DROP CONSTRAINT "CHK_posts_format",
        DROP CONSTRAINT "CHK_posts_channel",
        DROP COLUMN "featuredPriority",
        DROP COLUMN "isFeatured",
        DROP COLUMN "seoDescription",
        DROP COLUMN "seoTitle",
        DROP COLUMN "imageCredit",
        DROP COLUMN "imageCaption",
        DROP COLUMN "imageAlt",
        DROP COLUMN "authorProfileId",
        DROP COLUMN "categoryId",
        DROP COLUMN "publishedAt",
        DROP COLUMN "status",
        DROP COLUMN "format",
        DROP COLUMN "channel",
        DROP COLUMN "excerpt",
        DROP COLUMN "slug"
    `);
    await queryRunner.query(`DROP TABLE "tags"`);
    await queryRunner.query(`DROP TABLE "categories"`);
    await queryRunner.query(`DROP TABLE "author_profiles"`);
  }
}

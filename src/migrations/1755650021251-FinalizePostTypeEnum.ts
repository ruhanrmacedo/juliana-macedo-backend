import { MigrationInterface, QueryRunner } from "typeorm";

export class FinalizePostTypeEnum1755650021251 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "posts_posttype_enum_new" AS ENUM ('Receita', 'Saúde', 'Artigo', 'Alimentação', 'Dicas', 'Novidades')
        `);

        await queryRunner.query(`
            ALTER TABLE "posts"
            ALTER COLUMN "postType" TYPE "posts_posttype_enum_new"
            USING ("postType"::text::"posts_posttype_enum_new")
        `);

        await queryRunner.query(`DROP TYPE "posts_posttype_enum"`);

        await queryRunner.query(`
            ALTER TYPE "posts_posttype_enum_new"
            RENAME TO "posts_posttype_enum"
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> { 
        await queryRunner.query(`
            CREATE TYPE "posts_posttype_enum_old" AS ENUM
            ('Receita','Saúde','Estudo','Bem-estar','Alimentação','Dicas','Novidades','Suplementação')
        `);

        await queryRunner.query(`
            ALTER TABLE "posts"
            ALTER COLUMN "postType" TYPE "posts_posttype_enum_old"
            USING ("postType"::text::"posts_posttype_enum_old")
        `);

        await queryRunner.query(`DROP TYPE "posts_posttype_enum"`);
        await queryRunner.query(`
            ALTER TYPE "posts_posttype_enum_old"
            RENAME TO "posts_posttype_enum"
        `);
  }
}

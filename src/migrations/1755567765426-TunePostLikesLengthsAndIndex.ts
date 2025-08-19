import { MigrationInterface, QueryRunner } from "typeorm";

export class TunePostLikesLengthsAndIndex1755567765426 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "post_likes" ALTER COLUMN "ip" TYPE varchar(64)`);
        await queryRunner.query(`ALTER TABLE "post_likes" ALTER COLUMN "user_agent" TYPE varchar(255)`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_post_likes_post_id" ON "post_likes" ("post_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_post_likes_post_id"`);
    }

}

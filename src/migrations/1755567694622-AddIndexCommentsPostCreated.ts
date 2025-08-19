import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIndexCommentsPostCreated1755567694622 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX "IDX_comments_post_created" ON "comments" ("post_id", "created_at")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_comments_post_created"`);
    }

}

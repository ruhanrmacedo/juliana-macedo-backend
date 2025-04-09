import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterCommentsComumnNames1744167194560 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "comments" RENAME COLUMN "edited_at" TO "updated_at"`);
        await queryRunner.query(`ALTER TABLE "comments" RENAME COLUMN "isEdited" TO "is_edited"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "comments" RENAME COLUMN "updated_at" TO "edited_at"`);
        await queryRunner.query(`ALTER TABLE "comments" RENAME COLUMN "is_edited" TO "isEdited"`);
    }

}

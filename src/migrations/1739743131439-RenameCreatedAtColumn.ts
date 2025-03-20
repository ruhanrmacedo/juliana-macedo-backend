import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameCreatedAtColumn1739743131439 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "posts" RENAME COLUMN "createdAt" TO "created_at"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "posts" RENAME COLUMN "created_at" TO "createdAt"`);
    }

}

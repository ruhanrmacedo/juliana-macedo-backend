import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameTimestampColumns1739743402120 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Renomear colunas da tabela posts
    await queryRunner.query(
      `ALTER TABLE "posts" RENAME COLUMN "updatedAt" TO "updated_at"`
    );

    // Renomear colunas da tabela users
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "createdAt" TO "created_at"`
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "updatedAt" TO "updated_at"`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverter nomes na tabela posts
    await queryRunner.query(
      `ALTER TABLE "posts" RENAME COLUMN "updated_at" TO "updatedAt"`
    );

    // Reverter nomes na tabela users
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "created_at" TO "createdAt"`
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "updated_at" TO "updatedAt"`
    );
  }
}

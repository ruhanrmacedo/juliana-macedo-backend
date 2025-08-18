import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueConstraintToPostLikes1754261087648 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE post_likes
      ADD CONSTRAINT unique_post_like_by_visitor
      UNIQUE (post_id, ip, user_agent);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE post_likes
        DROP CONSTRAINT unique_post_like_by_visitor;
      `);
  }
}

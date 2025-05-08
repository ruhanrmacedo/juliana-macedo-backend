import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateUsersTable1739479208177 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
              name: "users",
              columns: [
                {
                  name: "id",
                  type: "int",
                  isPrimary: true,
                  isGenerated: true,
                  generationStrategy: "increment",
                },
                {
                  name: "email",
                  type: "varchar",
                  isUnique: true,
                },
                {
                  name: "password",
                  type: "varchar",
                },
                {
                  name: "role",
                  type: "enum",
                  enum: ["admin", "user"],
                  default: "'user'",
                },
                {
                  name: "createdAt",
                  type: "timestamp",
                  default: "CURRENT_TIMESTAMP",
                },
                {
                  name: "updatedAt",
                  type: "timestamp",
                  default: "CURRENT_TIMESTAMP",
                  onUpdate: "CURRENT_TIMESTAMP",
                },
              ],
            })
          );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("users");
    }

}

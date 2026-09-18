import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from "typeorm";

export class AddPasswordResetInfrastructure1789580310999
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "auth_version",
        type: "int",
        isNullable: false,
        default: 0,
      })
    );

    await queryRunner.createTable(
      new Table({
        name: "password_reset_tokens",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          { name: "user_id", type: "int", isNullable: false },
          { name: "token_hash", type: "varchar", length: "64", isNullable: false },
          { name: "expires_at", type: "timestamptz", isNullable: false },
          { name: "used_at", type: "timestamptz", isNullable: true },
          { name: "invalidated_at", type: "timestamptz", isNullable: true },
          { name: "created_at", type: "timestamptz", default: "CURRENT_TIMESTAMP" },
        ],
      })
    );

    await queryRunner.createForeignKey(
      "password_reset_tokens",
      new TableForeignKey({
        name: "FK_password_reset_tokens_user",
        columnNames: ["user_id"],
        referencedTableName: "users",
        referencedColumnNames: ["id"],
        onDelete: "CASCADE",
      })
    );

    await queryRunner.createIndex(
      "password_reset_tokens",
      new TableIndex({
        name: "UQ_password_reset_tokens_token_hash",
        columnNames: ["token_hash"],
        isUnique: true,
      })
    );

    await queryRunner.createIndex(
      "password_reset_tokens",
      new TableIndex({
        name: "IDX_password_reset_tokens_user_expires",
        columnNames: ["user_id", "expires_at"],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("password_reset_tokens");
    await queryRunner.dropColumn("users", "auth_version");
  }
}

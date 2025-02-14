import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddNameToUsers1739492140523 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "users",
      new TableColumn({
        name: "name",
        type: "varchar",
        isNullable: true,
      })
    );

    await queryRunner.query(
      `UPDATE users SET name = 'Usuário Padrão' WHERE name IS NULL`
    );

    // Remove a possibilidade de valores nulos
    await queryRunner.changeColumn(
      "users",
      "name",
      new TableColumn({
        name: "name",
        type: "varchar",
        isNullable: false,
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("users", "name");
  }
}

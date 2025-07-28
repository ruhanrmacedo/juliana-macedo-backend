import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddCpfAndDataNascimentoToUsers1753138700307 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns("users", [
      new TableColumn({
        name: "cpf",
        type: "varchar",
        isUnique: true,
        isNullable: true,
      }),
      new TableColumn({
        name: "data_nascimento", // <- agora está no padrão correto
        type: "date",
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("users", "data_nascimento");
    await queryRunner.dropColumn("users", "cpf");
  }
}

import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from "typeorm";

export class CreatePostsTable1739492998968 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: "posts",
        columns: [
          {
            name: "id",
            type: "int",
            isPrimary: true,
            isGenerated: true,
            generationStrategy: "increment",
          },
          { name: "title", type: "varchar" },
          { name: "content", type: "text" },
          {
            name: "postType",
            type: "enum",
            enum: [
              "Receita",
              "Saúde",
              "Estudo",
              "Bem-estar",
              "Alimentação",
              "Dicas",
              "Novidades",
              "Suplementação",
            ],
          },
          { name: "isActive", type: "boolean", default: true },
          { name: "imageUrl", type: "varchar", isNullable: true },
          { name: "authorId", type: "int" },
          { name: "editedById", type: "int", isNullable: true },
          { name: "createdAt", type: "timestamp", default: "now()" },
          { name: "updatedAt", type: "timestamp", default: "now()" },
        ],
      })
    );

    await queryRunner.createForeignKey(
      "posts",
      new TableForeignKey({
        columnNames: ["authorId"],
        referencedColumnNames: ["id"],
        referencedTableName: "users",
        onDelete: "CASCADE",
      })
    );

    await queryRunner.createForeignKey(
      "posts",
      new TableForeignKey({
        columnNames: ["editedById"],
        referencedColumnNames: ["id"],
        referencedTableName: "users",
        onDelete: "SET NULL",
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("posts");
  }
}

import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreatePostLikesTable1743387834267 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "post_likes",
                columns: [
                    {
                        name: "id",
                        type: "int",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {
                        name: "post_id",
                        type: "int",
                    },
                    {
                        name: "ip",
                        type: "varchar",
                    },
                    {
                        name: "user_agent",
                        type: "varchar",
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "CURRENT_TIMESTAMP",
                    },
                ],
            })
        );

        await queryRunner.createForeignKey(
            "post_likes",
            new TableForeignKey({
                columnNames: ["post_id"],
                referencedTableName: "posts",
                referencedColumnNames: ["id"],
                onDelete: "CASCADE",
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("post_likes");
    }

}

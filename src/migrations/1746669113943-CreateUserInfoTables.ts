import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateUserInfoTables1746669113943 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Phones
        await queryRunner.createTable(
            new Table({
                name: "user_phones",
                columns: [
                    {
                        name: "id",
                        type: "int",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {
                        name: "number",
                        type: "varchar",
                    },
                    {
                        name: "user_id",
                        type: "int",
                    },
                ],
            })
        );

        await queryRunner.createForeignKey(
            "user_phones",
            new TableForeignKey({
                columnNames: ["user_id"],
                referencedTableName: "users",
                referencedColumnNames: ["id"],
                onDelete: "CASCADE",
            })
        );

        // Emails
        await queryRunner.createTable(
            new Table({
                name: "user_emails",
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
                    },
                    {
                        name: "user_id",
                        type: "int",
                    },
                ],
            })
        );

        await queryRunner.createForeignKey(
            "user_emails",
            new TableForeignKey({
                columnNames: ["user_id"],
                referencedTableName: "users",
                referencedColumnNames: ["id"],
                onDelete: "CASCADE",
            })
        );

        // Addresses
        await queryRunner.createTable(
            new Table({
                name: "user_addresses",
                columns: [
                    {
                        name: "id",
                        type: "int",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {
                        name: "street",
                        type: "varchar",
                    },
                    {
                        name: "city",
                        type: "varchar",
                    },
                    {
                        name: "state",
                        type: "varchar",
                    },
                    {
                        name: "postal_code",
                        type: "varchar",
                    },
                    {
                        name: "country",
                        type: "varchar",
                    },
                    {
                        name: "user_id",
                        type: "int",
                    },
                ],
            })
        );

        await queryRunner.createForeignKey(
            "user_addresses",
            new TableForeignKey({
                columnNames: ["user_id"],
                referencedTableName: "users",
                referencedColumnNames: ["id"],
                onDelete: "CASCADE",
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("user_addresses");
        await queryRunner.dropTable("user_emails");
        await queryRunner.dropTable("user_phones");
    }

}

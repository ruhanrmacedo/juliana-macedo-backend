import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateUserMetricsTable1742431881804 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "user_metrics",
                columns: [
                    {
                        name: "id",
                        type: "int",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment",
                    },
                    {
                        name: "user_id",
                        type: "int",
                    },
                    {
                        name: "peso",
                        type: "decimal",
                        precision: 5,
                        scale: 2,
                    },
                    {
                        name: "altura",
                        type: "decimal",
                        precision: 5,
                        scale: 2,
                    },
                    {
                        name: "idade",
                        type: "int",
                    },
                    {
                        name: "sexo",
                        type: "enum",
                        enum: ["M", "F"],
                    },
                    {
                        name: "nivel_atividade",
                        type: "enum",
                        enum: [
                            "Sedentário",
                            "Levemente Ativo",
                            "Moderadamente Ativo",
                            "Altamente Ativo",
                            "Atleta / Muito Ativo",
                        ],
                    },
                    {
                        name: "gordura_corporal",
                        type: "decimal",
                        precision: 5,
                        scale: 2,
                        isNullable: true,
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
            "user_metrics",
            new TableForeignKey({
                columnNames: ["user_id"],
                referencedColumnNames: ["id"],
                referencedTableName: "users",
                onDelete: "CASCADE",
            })
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("user_metrics");
    }

}

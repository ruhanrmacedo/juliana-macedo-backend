import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex, TableUnique } from "typeorm";

export class CreateAnthropometryTables1755990187483 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "sexo_enum" AS ENUM ('M','F')`);
        await queryRunner.query(`
            CREATE TYPE "anthropometry_method_enum" AS ENUM (
                'DURNIN_WOMERSLEY','FAULKNER','GUEDES',
                'JACKSON_POLLOCK_3','JACKSON_POLLOCK_7',
                'JACKSON_POLLOCK_WARD_3','JACKSON_POLLOCK_WARD_7',
                'PETROSKI','WHO_BAZ','WHO_HAZ','WHO_WHZ','SLAUGHTER'
            );
        `);

        // anthropometry_evaluation
        await queryRunner.createTable(new Table({
            name: "anthropometry_evaluation",
            columns: [
                { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
                { name: "user_id", type: "int", isNullable: false },
                { name: "assessor_id", type: "int", isNullable: true },
                { name: "measured_at", type: "timestamptz", isNullable: false },

                // snapshot
                { name: "peso", type: "decimal", precision: 6, scale: 2, isNullable: true },
                { name: "altura", type: "decimal", precision: 6, scale: 2, isNullable: true },
                { name: "idade", type: "int", isNullable: true },
                { name: "sexo", type: "sexo_enum", isNullable: true },

                // dobras (mm)
                { name: "triceps_mm", type: "decimal", precision: 6, scale: 2, isNullable: true },
                { name: "biceps_mm", type: "decimal", precision: 6, scale: 2, isNullable: true },
                { name: "subescapular_mm", type: "decimal", precision: 6, scale: 2, isNullable: true },
                { name: "supra_iliaca_mm", type: "decimal", precision: 6, scale: 2, isNullable: true },
                { name: "abdominal_mm", type: "decimal", precision: 6, scale: 2, isNullable: true },
                { name: "peitoral_torax_mm", type: "decimal", precision: 6, scale: 2, isNullable: true },
                { name: "axilar_media_mm", type: "decimal", precision: 6, scale: 2, isNullable: true },
                { name: "coxa_mm", type: "decimal", precision: 6, scale: 2, isNullable: true },
                { name: "panturrilha_medial_mm", type: "decimal", precision: 6, scale: 2, isNullable: true },

                // circunferências (cm)
                { name: "cintura_cm", type: "decimal", precision: 6, scale: 2, isNullable: true },
                { name: "quadril_cm", type: "decimal", precision: 6, scale: 2, isNullable: true },
                { name: "pescoco_cm", type: "decimal", precision: 6, scale: 2, isNullable: true },
                { name: "braco_muac_cm", type: "decimal", precision: 6, scale: 2, isNullable: true },
                { name: "coxa_circ_cm", type: "decimal", precision: 6, scale: 2, isNullable: true },
                { name: "panturrilha_circ_cm", type: "decimal", precision: 6, scale: 2, isNullable: true },

                { name: "extras", type: "jsonb", isNullable: true },

                { name: "created_at", type: "timestamptz", default: "now()" },
                { name: "updated_at", type: "timestamptz", default: "now()" },
            ],
        }));

        await queryRunner.createForeignKey("anthropometry_evaluation", new TableForeignKey({
            columnNames: ["user_id"],
            referencedTableName: "users",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
        }));

        await queryRunner.createForeignKey("anthropometry_evaluation", new TableForeignKey({
            columnNames: ["assessor_id"],
            referencedTableName: "users",
            referencedColumnNames: ["id"],
            onDelete: "SET NULL",
        }));

        await queryRunner.createIndex("anthropometry_evaluation", new TableIndex({
            name: "idx_anth_eval_user_measured_at",
            columnNames: ["user_id", "measured_at"],
        }));

        // anthropometry_result
        await queryRunner.createTable(new Table({
            name: "anthropometry_result",
            columns: [
                { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
                { name: "evaluation_id", type: "int", isNullable: false },
                { name: "method", type: "anthropometry_method_enum", isNullable: false },

                { name: "sexo", type: "sexo_enum", isNullable: false },
                { name: "idade", type: "int", isNullable: false },

                { name: "densidade_corp", type: "decimal", precision: 8, scale: 6, isNullable: true },
                { name: "percentual_gordura", type: "decimal", precision: 5, scale: 2, isNullable: true },
                { name: "massa_gorda_kg", type: "decimal", precision: 6, scale: 2, isNullable: true },
                { name: "massa_magra_kg", type: "decimal", precision: 6, scale: 2, isNullable: true },

                { name: "z_score", type: "decimal", precision: 6, scale: 3, isNullable: true },
                { name: "percentil", type: "decimal", precision: 5, scale: 2, isNullable: true },
                { name: "classificacao", type: "decimal", length: "40", isNullable: true },

                { name: "parametros_json", type: "jsonb", isNullable: true },
                { name: "version", type: "smallint", default: 1 },
                { name: "notes", type: "text", isNullable: true },

                { name: "created_at", type: "timestamptz", default: "now()" },
                { name: "updated_at", type: "timestamptz", default: "now()" },
            ],
            uniques: [
                new TableUnique({
                    name: "uq_anth_result_evaluation_method",
                    columnNames: ["evaluation_id", "method"],
                }),
            ],
        }));

        await queryRunner.createForeignKey("anthropometry_result", new TableForeignKey({
            columnNames: ["evaluation_id"],
            referencedTableName: "anthropometry_evaluation",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
        }));

        await queryRunner.createIndex("anthropometry_result", new TableIndex({
            name: "idx_anth_result_evaluation",
            columnNames: ["evaluation_id"],
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex("anthropometry_result", "idx_anth_result_evaluation");
        await queryRunner.dropTable("anthropometry_result");

        await queryRunner.dropIndex("anthropometry_evaluation", "idx_anth_eval_user_measured_at");
        await queryRunner.dropTable("anthropometry_evaluation");

        await queryRunner.query(`DROP TYPE "anthropometry_method_enum"`);
        await queryRunner.query(`DROP TYPE "sexo_enum"`);
    }
}
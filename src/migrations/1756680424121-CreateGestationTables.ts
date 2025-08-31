import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class CreateGestationTables1756680424121 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gestation_type_enum') THEN
                CREATE TYPE "gestation_type_enum" AS ENUM ('UNICA','GEMELAR','TRIGEMELAR');
                END IF;
                END $$;
        `);

        // 2) Tabela principal: gestation_tracking
        await queryRunner.createTable(new Table({
            name: "gestation_tracking",
            columns: [
                { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },

                { name: "user_id", type: "int", isNullable: false },

                { name: "peso_pre_gestacional", type: "decimal", precision: 5, scale: 2, isNullable: false },
                { name: "altura_cm", type: "decimal", precision: 5, scale: 2, isNullable: false },

                { name: "dum", type: "date", isNullable: false },
                { name: "idade_gestacional_inicio", type: "int", isNullable: true },

                { name: "tipo_gestacao", type: "gestation_type_enum", isNullable: false, default: `'UNICA'` },

                { name: "bmi_pre", type: "decimal", precision: 4, scale: 1, isNullable: false },
                { name: "bmi_class", type: "varchar", length: "20", isNullable: false },
                { name: "meta_ganho_min_kg", type: "decimal", precision: 4, scale: 1, isNullable: false },
                { name: "meta_ganho_max_kg", type: "decimal", precision: 4, scale: 1, isNullable: false },

                { name: "created_at", type: "timestamptz", default: "now()" },
                { name: "updated_at", type: "timestamptz", default: "now()" },
            ],
        }));

        await queryRunner.createForeignKey("gestation_tracking", new TableForeignKey({
            columnNames: ["user_id"],
            referencedTableName: "users",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
        }));

        await queryRunner.createIndex("gestation_tracking", new TableIndex({
            name: "idx_gestation_tracking_user",
            columnNames: ["user_id"],
        }));

        // 3) Tabela de visitas: gestation_visit
        await queryRunner.createTable(new Table({
            name: "gestation_visit",
            columns: [
                { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },

                { name: "tracking_id", type: "int", isNullable: false },

                { name: "data", type: "date", isNullable: false },
                { name: "peso_kg", type: "decimal", precision: 5, scale: 2, isNullable: false },

                { name: "idade_gestacional_sem", type: "int", isNullable: true },
                { name: "trimestre", type: "int", isNullable: true },

                { name: "pa_sis", type: "int", isNullable: true },
                { name: "pa_dia", type: "int", isNullable: true },

                { name: "observacoes", type: "text", isNullable: true },

                { name: "created_at", type: "timestamptz", default: "now()" },
            ],
        }));

        await queryRunner.createForeignKey("gestation_visit", new TableForeignKey({
            columnNames: ["tracking_id"],
            referencedTableName: "gestation_tracking",
            referencedColumnNames: ["id"],
            onDelete: "CASCADE",
        }));

        await queryRunner.createIndex("gestation_visit", new TableIndex({
            name: "idx_gestation_visit_tracking_date",
            columnNames: ["tracking_id", "data"],
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropIndex("gestation_visit", "idx_gestation_visit_tracking_date");
        await queryRunner.dropIndex("gestation_tracking", "idx_gestation_tracking_user");

        // Remover FKs
        const visitTable = await queryRunner.getTable("gestation_visit");
        const visitFk = visitTable?.foreignKeys.find(fk => fk.columnNames.includes("tracking_id"));
        if (visitFk) await queryRunner.dropForeignKey("gestation_visit", visitFk);

        const trackTable = await queryRunner.getTable("gestation_tracking");
        const trackFk = trackTable?.foreignKeys.find(fk => fk.columnNames.includes("user_id"));
        if (trackFk) await queryRunner.dropForeignKey("gestation_tracking", trackFk);

        // Dropar tabelas
        await queryRunner.dropTable("gestation_visit");
        await queryRunner.dropTable("gestation_tracking");

        // Dropar enum
        await queryRunner.query(`DROP TYPE IF EXISTS "gestation_type_enum"`);
    }

}

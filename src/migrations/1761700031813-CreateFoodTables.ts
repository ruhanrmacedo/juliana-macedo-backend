import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex, TableUnique } from "typeorm";

export class CreateFoodTables1761700031813 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        //
        // ========== TABLE: source_documents ==========
        //
        await queryRunner.createTable(
            new Table({
                name: "source_documents",
                columns: [
                    { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
                    { name: "title", type: "varchar", isNullable: false },
                    { name: "organization", type: "varchar", isNullable: true },
                    { name: "edition", type: "varchar", isNullable: true },
                    { name: "year", type: "int", isNullable: true },
                    { name: "url", type: "varchar", isNullable: true },
                    { name: "created_at", type: "timestamptz", default: "now()" },
                    { name: "updated_at", type: "timestamptz", default: "now()" },
                ],
            }),
            true
        );

        //
        // ========== TABLE: nutrients ==========
        //
        await queryRunner.query(
            `CREATE TYPE "nutrient_group_enum" AS ENUM ('MACRONUTRIENTES','VITAMINAS','MINERAIS','OUTROS')`
        );
        await queryRunner.createTable(
            new Table({
                name: "nutrients",
                columns: [
                    { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
                    { name: "code", type: "varchar", isNullable: false },
                    { name: "name", type: "varchar", isNullable: false },
                    { name: "unit", type: "varchar", isNullable: false },
                    { name: "group", type: "nutrient_group_enum", isNullable: false, default: "'OUTROS'" },
                    { name: "display_order", type: "int", default: 0 },
                    { name: "daily_value_ref", type: "decimal", precision: 14, scale: 4, isNullable: true },
                    { name: "notes", type: "text", isNullable: true },
                ],
            })
        );
        await queryRunner.createIndex(
            "nutrients",
            new TableIndex({ name: "idx_nutrient_code", columnNames: ["code"], isUnique: true })
        );

        //
        // ========== TABLE: foods ==========
        //
        await queryRunner.query(
            `CREATE TYPE "food_texture_enum" AS ENUM ('SOLIDO','LIQUIDO','SEMISOLIDO')`
        );
        await queryRunner.query(
            `CREATE TYPE "unit_base_enum" AS ENUM ('GRAMA','MILILITRO')`
        );
        await queryRunner.query(
            `CREATE TYPE "food_source_type_enum" AS ENUM ('USER','TACO','TBCA','LABEL')`
        );
        await queryRunner.createTable(
            new Table({
                name: "foods",
                columns: [
                    { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
                    { name: "name", type: "varchar", isNullable: false },
                    { name: "scientific_name", type: "varchar", isNullable: true },
                    { name: "category", type: "varchar", isNullable: true },
                    { name: "textura", type: "food_texture_enum", default: "'SOLIDO'" },
                    { name: "unit_base", type: "unit_base_enum", default: "'GRAMA'" },
                    { name: "density_g_ml", type: "decimal", precision: 10, scale: 3, isNullable: true },
                    { name: "source_type", type: "food_source_type_enum", default: "'USER'" },
                    { name: "owner_id", type: "int", isNullable: true },
                    { name: "is_active", type: "boolean", default: true },
                    { name: "created_at", type: "timestamptz", default: "now()" },
                    { name: "updated_at", type: "timestamptz", default: "now()" },
                ],
            })
        );
        await queryRunner.createIndex("foods", new TableIndex({ name: "idx_food_name_category", columnNames: ["name", "category"] }));
        await queryRunner.createForeignKey(
            "foods",
            new TableForeignKey({
                columnNames: ["owner_id"],
                referencedTableName: "users",
                referencedColumnNames: ["id"],
                onDelete: "SET NULL",
            })
        );

        //
        // ========== TABLE: food_aliases ==========
        //
        await queryRunner.createTable(
            new Table({
                name: "food_aliases",
                columns: [
                    { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
                    { name: "food_id", type: "int" },
                    { name: "alias", type: "varchar" },
                    { name: "locale", type: "varchar", default: "'pt-BR'" },
                ],
            })
        );
        await queryRunner.createForeignKey(
            "food_aliases",
            new TableForeignKey({
                columnNames: ["food_id"],
                referencedTableName: "foods",
                referencedColumnNames: ["id"],
                onDelete: "CASCADE",
            })
        );
        await queryRunner.createIndex("food_aliases", new TableIndex({ name: "idx_food_alias", columnNames: ["alias"] }));

        //
        // ========== TABLE: food_variants ==========
        //
        await queryRunner.createTable(
            new Table({
                name: "food_variants",
                columns: [
                    { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
                    { name: "food_id", type: "int" },
                    { name: "description", type: "varchar" },
                    { name: "preparation_method", type: "varchar", isNullable: true },
                    { name: "moisture_factor", type: "decimal", precision: 8, scale: 4, isNullable: true },
                    { name: "default_portion", type: "decimal", precision: 10, scale: 3, isNullable: true },
                    { name: "is_default", type: "boolean", default: false },
                    { name: "created_at", type: "timestamptz", default: "now()" },
                    { name: "updated_at", type: "timestamptz", default: "now()" },
                ],
            })
        );
        await queryRunner.createForeignKey(
            "food_variants",
            new TableForeignKey({
                columnNames: ["food_id"],
                referencedTableName: "foods",
                referencedColumnNames: ["id"],
                onDelete: "CASCADE",
            })
        );
        await queryRunner.createUniqueConstraint(
            "food_variants",
            new TableUnique({ name: "uq_food_variant_food_description", columnNames: ["food_id", "description"] })
        );

        //
        // ========== TABLE: household_measures ==========
        //
        await queryRunner.createTable(
            new Table({
                name: "household_measures",
                columns: [
                    { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
                    { name: "food_variant_id", type: "int" },
                    { name: "name", type: "varchar" },
                    { name: "quantity", type: "decimal", precision: 10, scale: 3, default: "1" },
                    { name: "grams", type: "decimal", precision: 12, scale: 3, isNullable: true },
                    { name: "milliliters", type: "decimal", precision: 12, scale: 3, isNullable: true },
                    { name: "is_default", type: "boolean", default: false },
                    { name: "notes", type: "varchar", isNullable: true },
                ],
            })
        );
        await queryRunner.createForeignKey(
            "household_measures",
            new TableForeignKey({
                columnNames: ["food_variant_id"],
                referencedTableName: "food_variants",
                referencedColumnNames: ["id"],
                onDelete: "CASCADE",
            })
        );

        //
        // ========== TABLE: food_nutrients ==========
        //
        await queryRunner.createTable(
            new Table({
                name: "food_nutrients",
                columns: [
                    { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
                    { name: "food_variant_id", type: "int" },
                    { name: "nutrient_id", type: "int" },
                    { name: "source_document_id", type: "int", isNullable: true },
                    { name: "value_per_100", type: "decimal", precision: 16, scale: 6, default: "0" },
                    { name: "min_value", type: "decimal", precision: 16, scale: 6, isNullable: true },
                    { name: "max_value", type: "decimal", precision: 16, scale: 6, isNullable: true },
                    { name: "std_deviation", type: "decimal", precision: 16, scale: 6, isNullable: true },
                    { name: "method", type: "varchar", isNullable: true },
                    { name: "data_quality", type: "varchar", isNullable: true },
                ],
                uniques: [
                    new TableUnique({ name: "uq_foodnutrient_variant_nutrient", columnNames: ["food_variant_id", "nutrient_id"] }),
                ],
            })
        );
        await queryRunner.createForeignKeys("food_nutrients", [
            new TableForeignKey({
                columnNames: ["food_variant_id"],
                referencedTableName: "food_variants",
                referencedColumnNames: ["id"],
                onDelete: "CASCADE",
            }),
            new TableForeignKey({
                columnNames: ["nutrient_id"],
                referencedTableName: "nutrients",
                referencedColumnNames: ["id"],
                onDelete: "RESTRICT",
            }),
            new TableForeignKey({
                columnNames: ["source_document_id"],
                referencedTableName: "source_documents",
                referencedColumnNames: ["id"],
                onDelete: "SET NULL",
            }),
        ]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("food_nutrients");
        await queryRunner.dropTable("household_measures");
        await queryRunner.dropTable("food_variants");
        await queryRunner.dropTable("food_aliases");
        await queryRunner.dropTable("foods");
        await queryRunner.dropTable("nutrients");
        await queryRunner.dropTable("source_documents");

        await queryRunner.query(`DROP TYPE "food_texture_enum"`);
        await queryRunner.query(`DROP TYPE "unit_base_enum"`);
        await queryRunner.query(`DROP TYPE "food_source_type_enum"`);
        await queryRunner.query(`DROP TYPE "nutrient_group_enum"`);
    }

}

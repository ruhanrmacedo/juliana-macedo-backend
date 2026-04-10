import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateMealPlanTables1761700157234 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        //
        // ========== TABLE: meal_plans ==========
        //
        await queryRunner.createTable(
            new Table({
                name: "meal_plans",
                columns: [
                    { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
                    { name: "patient_id", type: "int" },
                    { name: "created_by_id", type: "int", isNullable: true },
                    { name: "title", type: "varchar" },
                    { name: "notes", type: "text", isNullable: true },
                    { name: "start_date", type: "date", isNullable: true },
                    { name: "end_date", type: "date", isNullable: true },
                    { name: "is_active", type: "boolean", default: true },
                    { name: "created_at", type: "timestamptz", default: "now()" },
                    { name: "updated_at", type: "timestamptz", default: "now()" },
                ],
            })
        );
        await queryRunner.createForeignKeys("meal_plans", [
            new TableForeignKey({
                columnNames: ["patient_id"],
                referencedTableName: "users",
                referencedColumnNames: ["id"],
                onDelete: "CASCADE",
            }),
            new TableForeignKey({
                columnNames: ["created_by_id"],
                referencedTableName: "users",
                referencedColumnNames: ["id"],
                onDelete: "SET NULL",
            }),
        ]);

        //
        // ========== TABLE: meal_plan_days ==========
        //
        await queryRunner.createTable(
            new Table({
                name: "meal_plan_days",
                columns: [
                    { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
                    { name: "plan_id", type: "int" },
                    { name: "weekday", type: "int", isNullable: true },
                    { name: "label", type: "varchar", isNullable: true },
                    { name: "order", type: "int", default: 0 },
                ],
            })
        );
        await queryRunner.createForeignKey(
            "meal_plan_days",
            new TableForeignKey({
                columnNames: ["plan_id"],
                referencedTableName: "meal_plans",
                referencedColumnNames: ["id"],
                onDelete: "CASCADE",
            })
        );

        //
        // ========== TABLE: meals ==========
        //
        await queryRunner.createTable(
            new Table({
                name: "meals",
                columns: [
                    { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
                    { name: "plan_id", type: "int", isNullable: true },
                    { name: "day_id", type: "int", isNullable: true },
                    { name: "name", type: "varchar" },
                    { name: "scheduled_time", type: "time", isNullable: true },
                    { name: "order", type: "int", default: 0 },
                ],
            })
        );
        await queryRunner.createForeignKeys("meals", [
            new TableForeignKey({
                columnNames: ["plan_id"],
                referencedTableName: "meal_plans",
                referencedColumnNames: ["id"],
                onDelete: "CASCADE",
            }),
            new TableForeignKey({
                columnNames: ["day_id"],
                referencedTableName: "meal_plan_days",
                referencedColumnNames: ["id"],
                onDelete: "CASCADE",
            }),
        ]);

        //
        // ========== TABLE: meal_items ==========
        //
        await queryRunner.createTable(
            new Table({
                name: "meal_items",
                columns: [
                    { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
                    { name: "meal_id", type: "int" },
                    { name: "food_variant_id", type: "int" },
                    { name: "measure_id", type: "int", isNullable: true },
                    { name: "quantity", type: "decimal", precision: 10, scale: 3, default: "1" },
                    { name: "grams_ml", type: "decimal", precision: 12, scale: 3, isNullable: true },
                    { name: "notes", type: "text", isNullable: true },
                    { name: "order", type: "int", default: 0 },
                ],
            })
        );
        await queryRunner.createForeignKeys("meal_items", [
            new TableForeignKey({
                columnNames: ["meal_id"],
                referencedTableName: "meals",
                referencedColumnNames: ["id"],
                onDelete: "CASCADE",
            }),
            new TableForeignKey({
                columnNames: ["food_variant_id"],
                referencedTableName: "food_variants",
                referencedColumnNames: ["id"],
                onDelete: "RESTRICT",
            }),
            new TableForeignKey({
                columnNames: ["measure_id"],
                referencedTableName: "household_measures",
                referencedColumnNames: ["id"],
                onDelete: "SET NULL",
            }),
        ]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("meal_items");
        await queryRunner.dropTable("meals");
        await queryRunner.dropTable("meal_plan_days");
        await queryRunner.dropTable("meal_plans");
    }

}

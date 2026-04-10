import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddWaistToGestationVisit1758166327013 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            "gestation_visit",
            new TableColumn({
                name: "cintura_cm",
                type: "decimal",
                precision: 6,
                scale: 2,
                isNullable: true,
            })
        );

        // Retropreenche a cintura nas visitas com a última AE do mesmo dia
        await queryRunner.query(`
            UPDATE gestation_visit AS v
            SET cintura_cm = ae.cintura_cm
            FROM (
                SELECT DISTINCT ON (user_id, measured_at::date)
                    user_id,
                    measured_at::date AS day,
                    cintura_cm,
                    updated_at
            FROM anthropometry_evaluation
            WHERE cintura_cm IS NOT NULL
            ORDER BY user_id, measured_at::date, updated_at DESC
        ) AS ae,
            gestation_tracking AS t
            WHERE t.id = v.tracking_id
                AND t.user_id = ae.user_id
                AND v.data = ae.day
                AND v.cintura_cm IS NULL;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("gestation_visit", "cintura_cm");
    }

}

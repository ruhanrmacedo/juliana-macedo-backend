import { MigrationInterface, QueryRunner } from "typeorm";

export class FixAnthResultClassificacaoType1755995676357 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE anthropometry_result
            ALTER COLUMN classificacao TYPE varchar(40)
            USING classificacao::text;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE anthropometry_result
            ALTER COLUMN classificacao TYPE decimal
            USING NULL
        `);
    }
}
import { MigrationInterface, QueryRunner } from "typeorm";

export class AlignEnumsToEntities1761794669690 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1) nutrient_group_enum — adicionar valores ausentes
        await queryRunner.query(`ALTER TYPE nutrient_group_enum ADD VALUE IF NOT EXISTS 'ENERGIA'`);
        await queryRunner.query(`ALTER TYPE nutrient_group_enum ADD VALUE IF NOT EXISTS 'LIPIDOS_DETALHADOS'`);
        await queryRunner.query(`ALTER TYPE nutrient_group_enum ADD VALUE IF NOT EXISTS 'CARBOIDRATOS_DETALHADOS'`);
        await queryRunner.query(`ALTER TYPE nutrient_group_enum ADD VALUE IF NOT EXISTS 'AMINOACIDOS'`);

        // 2) food_texture_enum — adicionar valores usados no código
        await queryRunner.query(`ALTER TYPE food_texture_enum ADD VALUE IF NOT EXISTS 'PASTA'`);
        await queryRunner.query(`ALTER TYPE food_texture_enum ADD VALUE IF NOT EXISTS 'PO'`);
        // (mantemos SEMISOLIDO se existir; código não usa, mas não quebra)

        // 3) food_source_type_enum — renomear LABEL→FABRICANTE e adicionar valores
        // RENAME VALUE só existe no PG >= 10, rode condicionalmente:
        await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'food_source_type_enum' AND e.enumlabel = 'LABEL'
        ) THEN
          ALTER TYPE food_source_type_enum RENAME VALUE 'LABEL' TO 'FABRICANTE';
        END IF;
      END$$;
    `);
        await queryRunner.query(`ALTER TYPE food_source_type_enum ADD VALUE IF NOT EXISTS 'TBCA_72'`);
        await queryRunner.query(`ALTER TYPE food_source_type_enum ADD VALUE IF NOT EXISTS 'SUPLEMENTOS'`);
        await queryRunner.query(`ALTER TYPE food_source_type_enum ADD VALUE IF NOT EXISTS 'RECEITA'`);

        // 4) unit_base_enum — migrar de GRAMA/MILILITRO -> g/ml
        // Criar novo enum v2
        await queryRunner.query(`CREATE TYPE unit_base_enum_v2 AS ENUM ('g','ml')`);

        // Alterar coluna foods.unit_base para usar o novo enum com mapeamento
        await queryRunner.query(`
      ALTER TABLE foods
      ALTER COLUMN unit_base DROP DEFAULT;
    `);
        await queryRunner.query(`
      ALTER TABLE foods
      ALTER COLUMN unit_base TYPE unit_base_enum_v2
      USING (
        CASE unit_base
          WHEN 'GRAMA' THEN 'g'::unit_base_enum_v2
          WHEN 'MILILITRO' THEN 'ml'::unit_base_enum_v2
          ELSE unit_base::text::unit_base_enum_v2
        END
      );
    `);

        // Remover enum antigo e renomear o novo para o nome original
        await queryRunner.query(`DROP TYPE unit_base_enum`);
        await queryRunner.query(`ALTER TYPE unit_base_enum_v2 RENAME TO unit_base_enum`);

        // (Opcional) recolocar default conforme sua migration/entidade:
        // g = base 100 g; ml = base 100 ml. Seu Entity default é GRAMA, mas agora são 'g'/'ml'.
        await queryRunner.query(`
      ALTER TABLE foods
      ALTER COLUMN unit_base SET DEFAULT 'g'::unit_base_enum
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverter unit_base_enum para GRAMA/MILILITRO
        await queryRunner.query(`CREATE TYPE unit_base_enum_old AS ENUM ('GRAMA','MILILITRO')`);
        await queryRunner.query(`
      ALTER TABLE foods
      ALTER COLUMN unit_base DROP DEFAULT
    `);
        await queryRunner.query(`
      ALTER TABLE foods
      ALTER COLUMN unit_base TYPE unit_base_enum_old
      USING (
        CASE unit_base::text
          WHEN 'g'  THEN 'GRAMA'::unit_base_enum_old
          WHEN 'ml' THEN 'MILILITRO'::unit_base_enum_old
          ELSE 'GRAMA'::unit_base_enum_old
        END
      );
    `);
        await queryRunner.query(`DROP TYPE unit_base_enum`);
        await queryRunner.query(`ALTER TYPE unit_base_enum_old RENAME TO unit_base_enum`);
        await queryRunner.query(`
      ALTER TABLE foods
      ALTER COLUMN unit_base SET DEFAULT 'GRAMA'::unit_base_enum
    `);

        // Reverter food_source_type_enum – não há DROP VALUE; tentamos renomear FABRICANTE->LABEL se existir
        await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'food_source_type_enum' AND e.enumlabel = 'FABRICANTE'
        ) THEN
          ALTER TYPE food_source_type_enum RENAME VALUE 'FABRICANTE' TO 'LABEL';
        END IF;
      END$$;
    `);
    }

}

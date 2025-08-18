import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddViewsToPost1754259964741 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumns("posts", [
            new TableColumn({
                name: "views",
                type: "int",
                isNullable: false,
                default: 0,
            }),
        ]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("posts", "views");
    }

}

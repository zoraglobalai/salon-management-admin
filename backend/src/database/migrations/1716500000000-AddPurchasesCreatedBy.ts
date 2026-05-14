import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPurchasesCreatedBy1716500000000 implements MigrationInterface {
  name = "AddPurchasesCreatedBy1716500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE purchases
      ADD COLUMN IF NOT EXISTS created_by text NOT NULL DEFAULT ''
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE purchases
      DROP COLUMN IF EXISTS created_by
    `);
  }
}


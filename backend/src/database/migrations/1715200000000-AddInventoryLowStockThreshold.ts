import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventoryLowStockThreshold1715200000000 implements MigrationInterface {
  name = 'AddInventoryLowStockThreshold1715200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "inventory"
      ADD COLUMN IF NOT EXISTS "low_stock_threshold" numeric(12,2) NOT NULL DEFAULT 5
    `);

    await queryRunner.query(`
      UPDATE "inventory"
      SET "low_stock_threshold" = CASE
        WHEN COALESCE("low_stock_threshold", 0) > 0 THEN "low_stock_threshold"
        WHEN COALESCE("reorder_level", 0) > 0 THEN "reorder_level"
        ELSE 5
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "inventory"
      DROP COLUMN IF EXISTS "low_stock_threshold"
    `);
  }
}

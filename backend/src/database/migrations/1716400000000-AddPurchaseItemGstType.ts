import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPurchaseItemGstType1716400000000 implements MigrationInterface {
  name = "AddPurchaseItemGstType1716400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE purchase_items
      ADD COLUMN IF NOT EXISTS gst_type text NOT NULL DEFAULT 'AMOUNT'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE purchase_items
      DROP COLUMN IF EXISTS gst_type
    `);
  }
}


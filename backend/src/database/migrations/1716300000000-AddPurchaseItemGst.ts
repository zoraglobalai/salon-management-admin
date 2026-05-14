import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPurchaseItemGst1716300000000 implements MigrationInterface {
  name = "AddPurchaseItemGst1716300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE purchase_items
      ADD COLUMN IF NOT EXISTS gst numeric(12,2) NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE purchase_items
      DROP COLUMN IF EXISTS gst
    `);
  }
}


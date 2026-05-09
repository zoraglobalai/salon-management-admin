import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddSaleServiceComboFields1715400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sale_services"
      ADD COLUMN IF NOT EXISTS "combo_service_id" uuid,
      ADD COLUMN IF NOT EXISTS "combo_service_name" text,
      ADD COLUMN IF NOT EXISTS "combo_total_price" numeric(12,2)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sale_services"
      DROP COLUMN IF EXISTS "combo_total_price",
      DROP COLUMN IF EXISTS "combo_service_name",
      DROP COLUMN IF EXISTS "combo_service_id"
    `);
  }
}

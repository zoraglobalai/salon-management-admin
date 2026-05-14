import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSubscriptionProrationFields1715900000000 implements MigrationInterface {
  name = "AddSubscriptionProrationFields1715900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD COLUMN IF NOT EXISTS "base_plan_price" numeric(10,2) NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ADD COLUMN IF NOT EXISTS "remaining_credit" numeric(10,2) NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "revenue_transactions"
      ADD COLUMN IF NOT EXISTS "base_plan_price" numeric(10,2) NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "revenue_transactions"
      ADD COLUMN IF NOT EXISTS "remaining_credit" numeric(10,2) NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "revenue_transactions"
      DROP COLUMN IF EXISTS "remaining_credit"
    `);
    await queryRunner.query(`
      ALTER TABLE "revenue_transactions"
      DROP COLUMN IF EXISTS "base_plan_price"
    `);
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      DROP COLUMN IF EXISTS "remaining_credit"
    `);
    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      DROP COLUMN IF EXISTS "base_plan_price"
    `);
  }
}

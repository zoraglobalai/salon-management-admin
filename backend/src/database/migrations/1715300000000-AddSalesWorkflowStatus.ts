import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddSalesWorkflowStatus1715300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sales"
      ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'COMPLETED',
      ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);

    await queryRunner.query(`
      UPDATE "sales"
      SET "status" = COALESCE(NULLIF("status", ''), 'COMPLETED'),
          "updated_at" = COALESCE("updated_at", "created_at", NOW())
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'sales_status_check'
        ) THEN
          ALTER TABLE "sales"
          ADD CONSTRAINT "sales_status_check"
          CHECK ("status" IN ('DRAFT', 'COMPLETED'));
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "sales"
      ALTER COLUMN "payment_method" DROP NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "sale_services"
      ALTER COLUMN "staff_id" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sale_services"
      ALTER COLUMN "staff_id" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "sales"
      ALTER COLUMN "payment_method" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "sales"
      DROP CONSTRAINT IF EXISTS "sales_status_check"
    `);

    await queryRunner.query(`
      ALTER TABLE "sales"
      DROP COLUMN IF EXISTS "updated_at",
      DROP COLUMN IF EXISTS "status"
    `);
  }
}

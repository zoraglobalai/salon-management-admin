import { MigrationInterface, QueryRunner } from 'typeorm';

export class SyncSubscriptionPlanEnum1714400000000 implements MigrationInterface {
  name = 'SyncSubscriptionPlanEnum1714400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = 'subscriptions_plan_enum'
        ) THEN
          IF EXISTS (
            SELECT 1
            FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = 'subscriptions_plan_enum'
              AND e.enumlabel = 'BASIC'
          ) AND NOT EXISTS (
            SELECT 1
            FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = 'subscriptions_plan_enum'
              AND e.enumlabel = 'STANDARD'
          ) THEN
            ALTER TYPE "subscriptions_plan_enum" RENAME VALUE 'BASIC' TO 'STANDARD';
          END IF;

          IF NOT EXISTS (
            SELECT 1
            FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = 'subscriptions_plan_enum'
              AND e.enumlabel = 'CUSTOM'
          ) THEN
            ALTER TYPE "subscriptions_plan_enum" ADD VALUE 'CUSTOM';
          END IF;
        ELSE
          CREATE TYPE "subscriptions_plan_enum" AS ENUM ('STANDARD', 'PRO', 'CUSTOM');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ALTER COLUMN "plan" SET DEFAULT 'STANDARD'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM "subscriptions"
          WHERE "plan"::text = 'CUSTOM'
        ) THEN
          RAISE EXCEPTION 'Cannot revert subscription plan enum while CUSTOM rows exist.';
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ALTER COLUMN "plan" DROP DEFAULT
    `);

    await queryRunner.query(`
      ALTER TYPE "subscriptions_plan_enum" RENAME TO "subscriptions_plan_enum_old"
    `);

    await queryRunner.query(`
      CREATE TYPE "subscriptions_plan_enum" AS ENUM ('BASIC', 'PRO')
    `);

    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ALTER COLUMN "plan"
      TYPE "subscriptions_plan_enum"
      USING (
        CASE
          WHEN "plan"::text = 'STANDARD' THEN 'BASIC'
          ELSE "plan"::text
        END
      )::"subscriptions_plan_enum"
    `);

    await queryRunner.query(`
      DROP TYPE "subscriptions_plan_enum_old"
    `);

    await queryRunner.query(`
      ALTER TABLE "subscriptions"
      ALTER COLUMN "plan" SET DEFAULT 'BASIC'
    `);
  }
}

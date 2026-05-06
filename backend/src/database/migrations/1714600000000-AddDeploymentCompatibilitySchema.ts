import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeploymentCompatibilitySchema1714600000000 implements MigrationInterface {
  name = 'AddDeploymentCompatibilitySchema1714600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "support_tickets"
      ADD COLUMN IF NOT EXISTS "tenant_id" uuid,
      ADD COLUMN IF NOT EXISTS "branch_id" uuid,
      ADD COLUMN IF NOT EXISTS "user_id" uuid,
      ADD COLUMN IF NOT EXISTS "subject" text,
      ADD COLUMN IF NOT EXISTS "priority" text NOT NULL DEFAULT 'medium',
      ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);

    await queryRunner.query(`
      UPDATE "support_tickets"
      SET
        "tenant_id" = COALESCE("tenant_id", "tenantId"),
        "subject" = COALESCE(NULLIF("subject", ''), "issue"),
        "priority" = COALESCE(NULLIF("priority", ''), 'medium'),
        "created_at" = COALESCE("created_at", "createdAt")
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION sync_support_tickets_compat_columns()
      RETURNS trigger AS $$
      BEGIN
        NEW."tenantId" := COALESCE(NEW."tenantId", NEW."tenant_id");
        NEW."tenant_id" := COALESCE(NEW."tenant_id", NEW."tenantId");
        NEW."issue" := COALESCE(NEW."issue", NEW."subject");
        NEW."subject" := COALESCE(NEW."subject", NEW."issue");
        NEW."priority" := COALESCE(NULLIF(NEW."priority", ''), 'medium');
        NEW."createdAt" := COALESCE(NEW."createdAt", NEW."created_at", NOW());
        NEW."created_at" := COALESCE(NEW."created_at", NEW."createdAt", NOW());
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_sync_support_tickets_compat_columns ON "support_tickets";
      CREATE TRIGGER trg_sync_support_tickets_compat_columns
      BEFORE INSERT OR UPDATE ON "support_tickets"
      FOR EACH ROW
      EXECUTE FUNCTION sync_support_tickets_compat_columns();
    `);

    await queryRunner.query(`
      CREATE OR REPLACE VIEW "staff" AS
      SELECT
        sm."id" AS "id",
        sm."tenant_id" AS "tenant_id",
        sm."location_id" AS "branch_id",
        NULL::uuid AS "user_id",
        sm."name" AS "full_name",
        sm."role" AS "role_title",
        0::numeric(5,2) AS "attendance_rate",
        0::numeric(12,2) AS "monthly_salary",
        0::numeric(5,2) AS "performance_score",
        sm."created_at" AS "created_at"
      FROM "staff_members" sm
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS "staff"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_sync_support_tickets_compat_columns ON "support_tickets"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS sync_support_tickets_compat_columns()`);
  }
}

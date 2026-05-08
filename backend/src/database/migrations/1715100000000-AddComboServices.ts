import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddComboServices1715100000000 implements MigrationInterface {
  name = 'AddComboServices1715100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "combo_services" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "location_id" uuid NOT NULL REFERENCES "branches"("id") ON DELETE CASCADE,
        "name" text NOT NULL,
        "price" numeric(12,2) NOT NULL DEFAULT 0,
        "duration" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "combo_service_items" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "combo_service_id" uuid NOT NULL REFERENCES "combo_services"("id") ON DELETE CASCADE,
        "service_id" uuid NOT NULL REFERENCES "services"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'uq_combo_service_items_combo_service'
        ) THEN
          ALTER TABLE "combo_service_items"
          ADD CONSTRAINT "uq_combo_service_items_combo_service" UNIQUE ("combo_service_id", "service_id");
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "combo_service_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "combo_services"`);
  }
}

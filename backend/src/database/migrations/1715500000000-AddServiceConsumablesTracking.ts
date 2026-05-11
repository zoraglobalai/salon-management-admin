import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddServiceConsumablesTracking1715500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Rename service_products to service_consumables if it exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'service_products') THEN
          ALTER TABLE "service_products" RENAME TO "service_consumables";
        END IF;
      END
      $$;
    `);

    // 2. Create service_consumables if it doesn't exist (with normalized names)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_consumables" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "service_id" uuid NOT NULL REFERENCES "services"("id") ON DELETE CASCADE,
        "inventory_item_id" uuid NOT NULL REFERENCES "inventory"("id") ON DELETE CASCADE,
        "consumption_quantity" numeric(12,2) NOT NULL DEFAULT 0,
        "consumption_unit" text NOT NULL DEFAULT 'ml',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // 3. Map old columns if we renamed and add missing columns
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'service_consumables' AND column_name = 'product_id') THEN
          ALTER TABLE "service_consumables" RENAME COLUMN "product_id" TO "inventory_item_id";
        END IF;
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'service_consumables' AND column_name = 'quantity_used') THEN
          ALTER TABLE "service_consumables" RENAME COLUMN "quantity_used" TO "consumption_quantity";
        END IF;
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'service_consumables' AND column_name = 'unit') THEN
          ALTER TABLE "service_consumables" RENAME COLUMN "unit" TO "consumption_unit";
        END IF;
        
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'service_consumables' AND column_name = 'updated_at') THEN
          ALTER TABLE "service_consumables" ADD COLUMN "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW();
        END IF;
      END
      $$;
    `);

    // 4. Create Indexes
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_service_consumables_service_id" ON "service_consumables"("service_id")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_service_consumables_inventory_item_id" ON "service_consumables"("inventory_item_id")`);

    // 5. Ensure inventory quantity and stock are numeric (they should be, but let's be sure)
    await queryRunner.query(`ALTER TABLE "inventory" ALTER COLUMN "quantity" TYPE numeric(12,2)`);
    await queryRunner.query(`ALTER TABLE "inventory" ALTER COLUMN "stock" TYPE numeric(12,2)`);
    await queryRunner.query(`ALTER TABLE "inventory" ALTER COLUMN "service_quantity" TYPE numeric(12,2)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // We don't want to lose data, but we can rename back if absolutely necessary
    // In production, we usually don't drop tables in down migrations unless it's safe
  }
}

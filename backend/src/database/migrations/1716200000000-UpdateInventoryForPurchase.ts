import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateInventoryForPurchase1716200000000 implements MigrationInterface {
  name = "UpdateInventoryForPurchase1716200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES vendors(id) ON DELETE SET NULL`);
    await queryRunner.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS last_purchase_id uuid REFERENCES purchases(id) ON DELETE SET NULL`);
    await queryRunner.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS last_purchase_date timestamptz`);
    await queryRunner.query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS product_category text NOT NULL DEFAULT ''`);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_inventory_vendor_id ON inventory(vendor_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_inventory_last_purchase_id ON inventory(last_purchase_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_inventory_tenant_location_name_unit ON inventory(tenant_id, location_id, name, unit)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inventory_tenant_location_name_unit`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inventory_last_purchase_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_inventory_vendor_id`);
    await queryRunner.query(`ALTER TABLE inventory DROP COLUMN IF EXISTS product_category`);
    await queryRunner.query(`ALTER TABLE inventory DROP COLUMN IF EXISTS last_purchase_date`);
    await queryRunner.query(`ALTER TABLE inventory DROP COLUMN IF EXISTS last_purchase_id`);
    await queryRunner.query(`ALTER TABLE inventory DROP COLUMN IF EXISTS vendor_id`);
  }
}


import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePurchaseItems1716100000000 implements MigrationInterface {
  name = "CreatePurchaseItems1716100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchase_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        purchase_id uuid NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
        product_name text NOT NULL,
        category text NOT NULL DEFAULT '',
        unit text NOT NULL,
        cost_price numeric(12,2) NOT NULL DEFAULT 0,
        initial_stock numeric(12,2) NOT NULL DEFAULT 0,
        initial_quantity numeric(12,2) NOT NULL DEFAULT 0,
        low_stock_alert numeric(12,2) NOT NULL DEFAULT 5,
        service_stock numeric(12,2) NOT NULL DEFAULT 0,
        expiry_date date,
        batch_number text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_purchase_items_product_name ON purchase_items(product_name)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS purchase_items`);
  }
}


import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePurchases1716000000000 implements MigrationInterface {
  name = "CreatePurchases1716000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS purchases (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        location_id uuid NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
        purchase_date date NOT NULL,
        invoice_number text NOT NULL DEFAULT '',
        payment_status text NOT NULL DEFAULT 'PENDING',
        payment_method text NOT NULL DEFAULT '',
        total_amount numeric(12,2) NOT NULL DEFAULT 0,
        notes text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_purchases_tenant_created ON purchases(tenant_id, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_purchases_tenant_vendor ON purchases(tenant_id, vendor_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_purchases_tenant_location ON purchases(tenant_id, location_id)`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS uq_purchases_tenant_location_invoice ON purchases(tenant_id, location_id, invoice_number)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS purchases`);
  }
}


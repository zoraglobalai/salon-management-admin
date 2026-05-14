import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateVendors1715900000000 implements MigrationInterface {
  name = "CreateVendors1715900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vendor_status_enum') THEN
          CREATE TYPE vendor_status_enum AS ENUM ('ACTIVE', 'INACTIVE');
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        vendor_name text NOT NULL,
        company_name text NOT NULL DEFAULT '',
        category text NOT NULL DEFAULT '',
        phone text NOT NULL DEFAULT '',
        email text NOT NULL DEFAULT '',
        address text NOT NULL DEFAULT '',
        gst_number text NOT NULL DEFAULT '',
        status vendor_status_enum NOT NULL DEFAULT 'ACTIVE',
        notes text NOT NULL DEFAULT '',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vendors_tenant_status ON vendors(tenant_id, status)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vendors_tenant_vendor_name ON vendors(tenant_id, vendor_name)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_vendors_tenant_company_name ON vendors(tenant_id, company_name)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS vendors`);
    await queryRunner.query(`DROP TYPE IF EXISTS vendor_status_enum`);
  }
}


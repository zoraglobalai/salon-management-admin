import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateExpenses1716610000000 implements MigrationInterface {
  name = "CreateExpenses1716610000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        expense_category text NOT NULL,
        sub_category text NOT NULL,
        amount numeric(12,2) NOT NULL DEFAULT 0,
        gst_amount numeric(12,2) NOT NULL DEFAULT 0,
        total_amount numeric(12,2) NOT NULL DEFAULT 0,
        payment_method text NOT NULL DEFAULT '',
        expense_date date NOT NULL,
        branch_id uuid NULL REFERENCES branches(id) ON DELETE SET NULL,
        vendor_id uuid NULL REFERENCES vendors(id) ON DELETE SET NULL,
        purchase_id uuid NULL REFERENCES purchases(id) ON DELETE SET NULL,
        staff_id uuid NULL REFERENCES staff_members(id) ON DELETE SET NULL,
        added_by text NOT NULL DEFAULT '',
        notes text NOT NULL DEFAULT '',
        invoice_file text NOT NULL DEFAULT '',
        status text NOT NULL DEFAULT 'PAID',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_expenses_tenant_date ON expenses(tenant_id, expense_date DESC, created_at DESC)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_expenses_tenant_branch ON expenses(tenant_id, branch_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_expenses_tenant_category ON expenses(tenant_id, expense_category, sub_category)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_expenses_vendor ON expenses(vendor_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_expenses_purchase ON expenses(purchase_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_expenses_staff ON expenses(staff_id)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS expenses`);
  }
}

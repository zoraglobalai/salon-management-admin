import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateExpenseCategories1716600000000 implements MigrationInterface {
  name = "CreateExpenseCategories1716600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS expense_categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        category text NOT NULL,
        sub_category text NOT NULL,
        is_system boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_expense_categories_category_sub_category
      ON expense_categories (LOWER(category), LOWER(sub_category))
    `);

    await queryRunner.query(`
      INSERT INTO expense_categories (category, sub_category, is_system)
      VALUES
        ('Staff Expenses', 'Staff Salary', true),
        ('Purchase Expenses', 'Product Purchase Amount', true),
        ('Purchase Expenses', 'Inventory Restock Cost', true),
        ('Purchase Expenses', 'Vendor Payments', true),
        ('Tax Expenses', 'GST Paid', true),
        ('Other Expenses', 'Utilities', true),
        ('Other Expenses', 'Rent', true),
        ('Other Expenses', 'Maintenance', true),
        ('Other Expenses', 'Marketing', true),
        ('Other Expenses', 'Miscellaneous', true)
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS expense_categories`);
  }
}

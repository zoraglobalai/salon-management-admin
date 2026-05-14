import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateSalaryExpenseRelation1716630000000 implements MigrationInterface {
  name = "UpdateSalaryExpenseRelation1716630000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE staff_payroll
      ADD COLUMN IF NOT EXISTS last_expense_id uuid NULL REFERENCES expenses(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_staff_payroll_last_expense_id
      ON staff_payroll(last_expense_id)
      WHERE last_expense_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_staff_payroll_last_expense_id`);
    await queryRunner.query(`ALTER TABLE staff_payroll DROP COLUMN IF EXISTS last_expense_id`);
  }
}

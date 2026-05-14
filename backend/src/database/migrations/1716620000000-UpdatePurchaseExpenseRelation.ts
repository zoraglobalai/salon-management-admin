import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdatePurchaseExpenseRelation1716620000000 implements MigrationInterface {
  name = "UpdatePurchaseExpenseRelation1716620000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE purchases
      ADD COLUMN IF NOT EXISTS expense_id uuid NULL REFERENCES expenses(id) ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_purchases_expense_id
      ON purchases(expense_id)
      WHERE expense_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_purchases_expense_id`);
    await queryRunner.query(`ALTER TABLE purchases DROP COLUMN IF EXISTS expense_id`);
  }
}

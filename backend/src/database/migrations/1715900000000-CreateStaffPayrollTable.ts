import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateStaffPayrollTable1715900000000 implements MigrationInterface {
  name = "CreateStaffPayrollTable1715900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create the staff_payroll table
    await queryRunner.query(`
      CREATE TABLE staff_payroll (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          staff_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE UNIQUE,
          salary_type VARCHAR(20) NOT NULL CHECK (
              salary_type IN ('monthly', 'weekly')
          ),
          salary_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
          payment_method VARCHAR(30) CHECK (
              payment_method IN ('Cash', 'Bank Transfer', 'UPI')
          ),
          bank_name VARCHAR(100),
          account_number VARCHAR(50),
          ifsc_code VARCHAR(20),
          upi_id VARCHAR(100),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 2. Migrate existing bank details from staff_members to staff_payroll
    // We assume 'monthly' and 0 salary as defaults for existing staff
    await queryRunner.query(`
      INSERT INTO staff_payroll (staff_id, salary_type, salary_amount, payment_method, bank_name, account_number, ifsc_code)
      SELECT id, 'monthly', 0, 'Bank Transfer', bank_name, account_number, ifsc_code
      FROM staff_members
      WHERE bank_name <> '' OR account_number <> '' OR ifsc_code <> '';
    `);

    // 3. Optional: Remove old columns from staff_members after verification
    // For now, we keep them for backward compatibility or until the backend is fully updated
    // ALTER TABLE staff_members DROP COLUMN bank_name, DROP COLUMN account_number, DROP COLUMN ifsc_code;
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE staff_payroll`);
  }
}

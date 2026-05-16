import { type MigrationInterface, type QueryRunner } from "typeorm";

export class AddTenantIdToAttendance1716800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE staff_members
      ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT TRUE;
    `);

    await queryRunner.query(`
      ALTER TABLE attendance
      ADD COLUMN IF NOT EXISTS tenant_id uuid;
    `);

    await queryRunner.query(`
      UPDATE attendance a
      SET tenant_id = sm.tenant_id
      FROM staff_members sm
      WHERE a.employee_id = sm.id
        AND a.tenant_id IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_attendance_tenant ON attendance(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_attendance_tenant_employee_date ON attendance(tenant_id, employee_id, attendance_date);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_attendance_tenant_employee_date;
      DROP INDEX IF EXISTS idx_attendance_tenant;
      ALTER TABLE attendance DROP COLUMN IF EXISTS tenant_id;
    `);
  }
}

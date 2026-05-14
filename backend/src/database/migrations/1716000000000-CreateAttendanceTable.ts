import { type MigrationInterface, type QueryRunner } from "typeorm";

export class CreateAttendanceTable1716000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE attendance (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
          branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
          attendance_date DATE NOT NULL,
          status VARCHAR(20) NOT NULL CHECK (
              status IN ('present', 'half_day', 'paid_leave', 'lop', 'week_off', 'holiday')
          ),
          marked_by UUID REFERENCES users(id) ON DELETE SET NULL,
          remarks TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(employee_id, attendance_date)
      );

      CREATE INDEX idx_attendance_employee ON attendance(employee_id);
      CREATE INDEX idx_attendance_date ON attendance(attendance_date);
      CREATE INDEX idx_attendance_branch ON attendance(branch_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE attendance;`);
  }
}

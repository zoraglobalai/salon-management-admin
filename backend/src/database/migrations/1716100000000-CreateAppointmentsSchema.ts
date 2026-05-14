import { type MigrationInterface, type QueryRunner } from "typeorm";

export class CreateAppointmentsSchema1716100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      -- Clean up any partial/conflicting state
      DROP TABLE IF EXISTS appointments CASCADE;
      DROP TABLE IF EXISTS salon_holidays CASCADE;

      -- appointments table
      CREATE TABLE appointments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        customer_id UUID REFERENCES clients(id) ON DELETE SET NULL,
        staff_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
        service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        appointment_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'booked' CHECK (
            status IN ('booked', 'confirmed', 'completed', 'cancelled', 'no_show')
        ),
        notes TEXT,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT chk_appointment_time CHECK (end_time > start_time)
      );

      -- indexes for performance
      CREATE INDEX idx_appt_tenant ON appointments(tenant_id);
      CREATE INDEX idx_appt_branch ON appointments(branch_id);
      CREATE INDEX idx_appt_date ON appointments(appointment_date);
      CREATE INDEX idx_appt_staff ON appointments(staff_id);
      CREATE INDEX idx_appt_status ON appointments(status);

      -- salon_holidays table
      CREATE TABLE salon_holidays (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
        holiday_name VARCHAR(100),
        holiday_date DATE NOT NULL,
        is_recurring BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX idx_holiday_tenant ON salon_holidays(tenant_id);
      CREATE INDEX idx_holiday_branch ON salon_holidays(branch_id);
      CREATE INDEX idx_holiday_date ON salon_holidays(holiday_date);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE appointments;`);
    await queryRunner.query(`DROP TABLE salon_holidays;`);
  }
}

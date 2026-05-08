import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStaffCurrentAddress1715000000000 implements MigrationInterface {
  name = 'AddStaffCurrentAddress1715000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "staff_members"
      ADD COLUMN IF NOT EXISTS "current_state" text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS "current_city" text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS "current_address_line" text NOT NULL DEFAULT ''
    `);

    await queryRunner.query(`
      UPDATE "staff_members"
      SET
        "current_state" = COALESCE(NULLIF("current_state", ''), "state", ''),
        "current_city" = COALESCE(NULLIF("current_city", ''), "city", ''),
        "current_address_line" = COALESCE(NULLIF("current_address_line", ''), "address_line", '')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "staff_members"
      DROP COLUMN IF EXISTS "current_address_line",
      DROP COLUMN IF EXISTS "current_city",
      DROP COLUMN IF EXISTS "current_state"
    `);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStaffIdentificationDetails1714900000000 implements MigrationInterface {
  name = 'AddStaffIdentificationDetails1714900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "staff_members"
      ADD COLUMN IF NOT EXISTS "identification_details" jsonb NOT NULL DEFAULT '[]'::jsonb
    `);

    await queryRunner.query(`
      UPDATE "staff_members"
      SET "identification_details" = CASE
        WHEN COALESCE(NULLIF("id_type", ''), NULLIF("id_number", '')) IS NULL THEN '[]'::jsonb
        ELSE jsonb_build_array(
          jsonb_build_object(
            'idType', COALESCE("id_type", ''),
            'idNumber', COALESCE("id_number", '')
          )
        )
      END
      WHERE "identification_details" = '[]'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "staff_members"
      DROP COLUMN IF EXISTS "identification_details"
    `);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOwnerTempPasswordFlags1716700000000 implements MigrationInterface {
  name = 'AddOwnerTempPasswordFlags1716700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "users_createdbyrole_enum" AS ENUM ('ADMIN', 'OWNER', 'SYSTEM');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "isTemporaryPassword" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "passwordResetRequired" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "createdByRole" "users_createdbyrole_enum"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "createdByRole"
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "passwordResetRequired"
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "isTemporaryPassword"
    `);
    await queryRunner.query(`
      DROP TYPE IF EXISTS "users_createdbyrole_enum"
    `);
  }
}

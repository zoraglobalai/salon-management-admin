import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserSessionVersion1715800000000 implements MigrationInterface {
  name = 'AddUserSessionVersion1715800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "sessionVersion" integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "sessionVersion"
    `);
  }
}

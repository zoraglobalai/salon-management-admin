import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlatformSettingsTable1714800000000 implements MigrationInterface {
  name = 'CreatePlatformSettingsTable1714800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "platform_settings" (
        "key" text NOT NULL,
        "value" text NOT NULL,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_platform_settings_key" PRIMARY KEY ("key")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "platform_settings" ("key", "value")
      VALUES ('trial_period_days', '7')
      ON CONFLICT ("key") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "platform_settings"`);
  }
}

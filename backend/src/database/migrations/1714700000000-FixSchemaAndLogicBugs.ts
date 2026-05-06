import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: FixSchemaAndLogicBugs
 *
 * Fixes data integrity issues introduced by the camelCase→snake_case migration:
 *  1. Backfills any branches rows where tenant_id / "tenantId" are out of sync.
 *  2. Resets any negative reorder_level values that were corrupted by the
 *     old moveStockToService logic that incorrectly decremented reorder_level.
 *  3. Adds a CHECK constraint to prevent reorder_level from going negative again.
 */
export class FixSchemaAndLogicBugs1714700000000 implements MigrationInterface {
  name = 'FixSchemaAndLogicBugs1714700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Backfill branches where tenant_id and "tenantId" are out of sync.
    //    On a fresh migrated DB the trigger handles this going forward,
    //    but existing rows inserted before the trigger existed may be stale.
    await queryRunner.query(`
      UPDATE branches
      SET
        tenant_id   = COALESCE(tenant_id, "tenantId"),
        "tenantId"  = COALESCE("tenantId", tenant_id)
      WHERE
        tenant_id IS DISTINCT FROM "tenantId"
        OR tenant_id IS NULL
        OR "tenantId" IS NULL
    `);

    // 2. Repair any reorder_level values that were incorrectly decremented
    //    below 0 by the old moveStockToService bug.
    await queryRunner.query(`
      UPDATE inventory
      SET reorder_level = 0
      WHERE reorder_level < 0
    `);

    // 3. Add a CHECK constraint so reorder_level can never go negative again.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'chk_inventory_reorder_level_non_negative'
            AND conrelid = 'inventory'::regclass
        ) THEN
          ALTER TABLE inventory
          ADD CONSTRAINT chk_inventory_reorder_level_non_negative
          CHECK (reorder_level >= 0);
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE inventory
      DROP CONSTRAINT IF EXISTS chk_inventory_reorder_level_non_negative
    `);
    // NOTE: We cannot reliably reverse the data backfill in down(),
    // so only the constraint is removed.
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOperationalSchema1714500000000 implements MigrationInterface {
  name = 'CreateOperationalSchema1714500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      ALTER TABLE "tenants"
      ADD COLUMN IF NOT EXISTS "contact_email" character varying(255),
      ADD COLUMN IF NOT EXISTS "subscription_status" text NOT NULL DEFAULT 'trial',
      ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);
    await queryRunner.query(`
      UPDATE "tenants"
      SET
        "contact_email" = COALESCE("contact_email", "email"),
        "subscription_status" = COALESCE(
          NULLIF("subscription_status", ''),
          CASE "status"::text
            WHEN 'ACTIVE' THEN 'active'
            WHEN 'EXPIRED' THEN 'expired'
            ELSE 'trial'
          END
        ),
        "created_at" = COALESCE("created_at", "createdAt")
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'UQ_tenants_contact_email'
        ) THEN
          ALTER TABLE "tenants"
          ADD CONSTRAINT "UQ_tenants_contact_email" UNIQUE ("contact_email");
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "branches"
      ADD COLUMN IF NOT EXISTS "tenant_id" uuid,
      ADD COLUMN IF NOT EXISTS "city" text,
      ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);
    await queryRunner.query(`
      UPDATE "branches"
      SET
        "tenant_id" = COALESCE("tenant_id", "tenantId"),
        "city" = COALESCE("city", SPLIT_PART("name", '-', 1)),
        "created_at" = COALESCE("created_at", "createdAt")
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "tenant_id" uuid,
      ADD COLUMN IF NOT EXISTS "branch_id" uuid,
      ADD COLUMN IF NOT EXISTS "full_name" character varying(255),
      ADD COLUMN IF NOT EXISTS "password_hash" text,
      ADD COLUMN IF NOT EXISTS "type" text,
      ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);
    await queryRunner.query(`
      UPDATE "users"
      SET
        "tenant_id" = COALESCE("tenant_id", "tenantId"),
        "branch_id" = COALESCE("branch_id", "branchId"),
        "full_name" = COALESCE("full_name", "name"),
        "password_hash" = COALESCE("password_hash", "password"),
        "type" = COALESCE(
          NULLIF("type", ''),
          CASE "role"::text
            WHEN 'SUPER_ADMIN' THEN 'admin'
            WHEN 'MANAGER' THEN 'manager'
            ELSE 'owner'
          END
        ),
        "is_active" = COALESCE("is_active", "isActive"),
        "created_at" = COALESCE("created_at", "createdAt")
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION sync_tenants_compat_columns()
      RETURNS trigger AS $$
      BEGIN
        NEW."email" := COALESCE(NEW."email", NEW."contact_email");
        NEW."contact_email" := COALESCE(NEW."contact_email", NEW."email");
        NEW."createdAt" := COALESCE(NEW."createdAt", NEW."created_at", NOW());
        NEW."created_at" := COALESCE(NEW."created_at", NEW."createdAt", NOW());

        IF NEW."status" IS NULL AND NEW."subscription_status" IS NOT NULL THEN
          NEW."status" := CASE LOWER(NEW."subscription_status")
            WHEN 'active' THEN 'ACTIVE'::"tenants_status_enum"
            WHEN 'expired' THEN 'EXPIRED'::"tenants_status_enum"
            ELSE 'TRIAL'::"tenants_status_enum"
          END;
        END IF;

        IF NEW."subscription_status" IS NULL OR NEW."subscription_status" = '' THEN
          NEW."subscription_status" := CASE NEW."status"::text
            WHEN 'ACTIVE' THEN 'active'
            WHEN 'EXPIRED' THEN 'expired'
            ELSE 'trial'
          END;
        END IF;

        RETURN NEW;
      END
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_sync_tenants_compat_columns ON "tenants";
      CREATE TRIGGER trg_sync_tenants_compat_columns
      BEFORE INSERT OR UPDATE ON "tenants"
      FOR EACH ROW
      EXECUTE FUNCTION sync_tenants_compat_columns();
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION sync_branches_compat_columns()
      RETURNS trigger AS $$
      BEGIN
        NEW."tenantId" := COALESCE(NEW."tenantId", NEW."tenant_id");
        NEW."tenant_id" := COALESCE(NEW."tenant_id", NEW."tenantId");
        NEW."createdAt" := COALESCE(NEW."createdAt", NEW."created_at", NOW());
        NEW."created_at" := COALESCE(NEW."created_at", NEW."createdAt", NOW());
        NEW."city" := COALESCE(NEW."city", SPLIT_PART(COALESCE(NEW."name", ''), '-', 1));
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_sync_branches_compat_columns ON "branches";
      CREATE TRIGGER trg_sync_branches_compat_columns
      BEFORE INSERT OR UPDATE ON "branches"
      FOR EACH ROW
      EXECUTE FUNCTION sync_branches_compat_columns();
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION sync_users_compat_columns()
      RETURNS trigger AS $$
      BEGIN
        NEW."name" := COALESCE(NEW."name", NEW."full_name");
        NEW."full_name" := COALESCE(NEW."full_name", NEW."name");
        NEW."password" := COALESCE(NEW."password", NEW."password_hash");
        NEW."password_hash" := COALESCE(NEW."password_hash", NEW."password");
        NEW."tenantId" := COALESCE(NEW."tenantId", NEW."tenant_id");
        NEW."tenant_id" := COALESCE(NEW."tenant_id", NEW."tenantId");
        NEW."branchId" := COALESCE(NEW."branchId", NEW."branch_id");
        NEW."branch_id" := COALESCE(NEW."branch_id", NEW."branchId");
        NEW."isActive" := COALESCE(NEW."isActive", NEW."is_active", TRUE);
        NEW."is_active" := COALESCE(NEW."is_active", NEW."isActive", TRUE);
        NEW."createdAt" := COALESCE(NEW."createdAt", NEW."created_at", NOW());
        NEW."created_at" := COALESCE(NEW."created_at", NEW."createdAt", NOW());

        IF NEW."role" IS NULL AND NEW."type" IS NOT NULL THEN
          NEW."role" := CASE LOWER(NEW."type")
            WHEN 'admin' THEN 'SUPER_ADMIN'::"users_role_enum"
            WHEN 'manager' THEN 'MANAGER'::"users_role_enum"
            ELSE 'OWNER'::"users_role_enum"
          END;
        END IF;

        IF NEW."type" IS NULL OR NEW."type" = '' THEN
          NEW."type" := CASE NEW."role"::text
            WHEN 'SUPER_ADMIN' THEN 'admin'
            WHEN 'MANAGER' THEN 'manager'
            ELSE 'owner'
          END;
        END IF;

        RETURN NEW;
      END
      $$ LANGUAGE plpgsql;
    `);
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trg_sync_users_compat_columns ON "users";
      CREATE TRIGGER trg_sync_users_compat_columns
      BEFORE INSERT OR UPDATE ON "users"
      FOR EACH ROW
      EXECUTE FUNCTION sync_users_compat_columns();
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "inventory" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "branch_id" uuid REFERENCES "branches"("id") ON DELETE CASCADE,
        "location_id" uuid NOT NULL REFERENCES "branches"("id") ON DELETE CASCADE,
        "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "item_name" text,
        "name" text NOT NULL DEFAULT '',
        "sku" text,
        "quantity" numeric(12,2) NOT NULL DEFAULT 0,
        "reorder_level" numeric(12,2) NOT NULL DEFAULT 0,
        "unit_cost" numeric(12,2) NOT NULL DEFAULT 0,
        "cost_price" numeric(12,2) NOT NULL DEFAULT 0,
        "unit" text NOT NULL DEFAULT 'pcs',
        "stock" numeric(12,2) NOT NULL DEFAULT 0,
        "service_quantity" numeric(12,2) NOT NULL DEFAULT 0,
        "benefits" text NOT NULL DEFAULT '',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "inventory"
      ADD COLUMN IF NOT EXISTS "branch_id" uuid,
      ADD COLUMN IF NOT EXISTS "location_id" uuid,
      ADD COLUMN IF NOT EXISTS "user_id" uuid,
      ADD COLUMN IF NOT EXISTS "item_name" text,
      ADD COLUMN IF NOT EXISTS "name" text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS "sku" text,
      ADD COLUMN IF NOT EXISTS "quantity" numeric(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "reorder_level" numeric(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "unit_cost" numeric(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "cost_price" numeric(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "unit" text NOT NULL DEFAULT 'pcs',
      ADD COLUMN IF NOT EXISTS "stock" numeric(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "service_quantity" numeric(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "benefits" text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);
    await queryRunner.query(`
      UPDATE "inventory"
      SET
        "location_id" = COALESCE("location_id", "branch_id"),
        "branch_id" = COALESCE("branch_id", "location_id"),
        "name" = COALESCE(NULLIF("name", ''), "item_name", ''),
        "item_name" = COALESCE("item_name", NULLIF("name", '')),
        "cost_price" = COALESCE("cost_price", "unit_cost", 0),
        "unit_cost" = COALESCE("unit_cost", "cost_price", 0),
        "stock" = COALESCE("stock", "reorder_level", 0),
        "reorder_level" = COALESCE("reorder_level", "stock", 0)
    `);
    await queryRunner.query(`ALTER TABLE "inventory" ALTER COLUMN "location_id" SET NOT NULL`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "services" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "branch_id" uuid REFERENCES "branches"("id") ON DELETE CASCADE,
        "location_id" uuid NOT NULL REFERENCES "branches"("id") ON DELETE CASCADE,
        "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "name" text NOT NULL,
        "duration_minutes" integer,
        "duration" integer NOT NULL DEFAULT 0,
        "price" numeric(12,2) NOT NULL DEFAULT 0,
        "category" text,
        "benefits" text NOT NULL DEFAULT '',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "services"
      ADD COLUMN IF NOT EXISTS "branch_id" uuid,
      ADD COLUMN IF NOT EXISTS "location_id" uuid,
      ADD COLUMN IF NOT EXISTS "user_id" uuid,
      ADD COLUMN IF NOT EXISTS "duration_minutes" integer,
      ADD COLUMN IF NOT EXISTS "duration" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "category" text,
      ADD COLUMN IF NOT EXISTS "benefits" text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);
    await queryRunner.query(`
      UPDATE "services"
      SET
        "location_id" = COALESCE("location_id", "branch_id"),
        "branch_id" = COALESCE("branch_id", "location_id"),
        "duration" = COALESCE("duration", "duration_minutes", 0),
        "duration_minutes" = COALESCE("duration_minutes", "duration", 0),
        "benefits" = COALESCE(NULLIF("benefits", ''), "category", ''),
        "category" = COALESCE("category", NULLIF("benefits", '')),
        "updated_at" = COALESCE("updated_at", "created_at", NOW())
    `);
    await queryRunner.query(`ALTER TABLE "services" ALTER COLUMN "location_id" SET NOT NULL`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "service_products" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "service_id" uuid NOT NULL REFERENCES "services"("id") ON DELETE CASCADE,
        "product_id" uuid NOT NULL REFERENCES "inventory"("id") ON DELETE CASCADE,
        "quantity_used" numeric(12,2) NOT NULL DEFAULT 0,
        "unit" text NOT NULL DEFAULT 'pcs'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "staff_members" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "location_id" uuid NOT NULL REFERENCES "branches"("id") ON DELETE CASCADE,
        "name" text NOT NULL,
        "role" text NOT NULL DEFAULT '',
        "phone_number" text NOT NULL DEFAULT '',
        "state" text NOT NULL DEFAULT '',
        "city" text NOT NULL DEFAULT '',
        "address_line" text NOT NULL DEFAULT '',
        "bank_name" text NOT NULL DEFAULT '',
        "account_number" text NOT NULL DEFAULT '',
        "ifsc_code" text NOT NULL DEFAULT '',
        "id_type" text NOT NULL DEFAULT '',
        "id_number" text NOT NULL DEFAULT '',
        "joining_date" date,
        "notes" text NOT NULL DEFAULT '',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "staff_members"
      ADD COLUMN IF NOT EXISTS "joining_date" date,
      ADD COLUMN IF NOT EXISTS "notes" text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "clients" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "branch_id" uuid REFERENCES "branches"("id") ON DELETE CASCADE,
        "location_id" uuid NOT NULL REFERENCES "branches"("id") ON DELETE CASCADE,
        "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "full_name" text,
        "name" text NOT NULL DEFAULT '',
        "phone" text,
        "phone_number" text NOT NULL DEFAULT '',
        "email" text,
        "hair_type" text NOT NULL DEFAULT 'Normal',
        "notes" text NOT NULL DEFAULT '',
        "tag" text NOT NULL DEFAULT 'NEW',
        "next_follow_up_date" date,
        "preferred_staff_id" uuid,
        "last_visit_at" TIMESTAMPTZ,
        "total_visits" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "clients"
      ADD COLUMN IF NOT EXISTS "branch_id" uuid,
      ADD COLUMN IF NOT EXISTS "location_id" uuid,
      ADD COLUMN IF NOT EXISTS "user_id" uuid,
      ADD COLUMN IF NOT EXISTS "full_name" text,
      ADD COLUMN IF NOT EXISTS "name" text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS "phone" text,
      ADD COLUMN IF NOT EXISTS "phone_number" text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS "email" text,
      ADD COLUMN IF NOT EXISTS "hair_type" text NOT NULL DEFAULT 'Normal',
      ADD COLUMN IF NOT EXISTS "notes" text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS "tag" text NOT NULL DEFAULT 'NEW',
      ADD COLUMN IF NOT EXISTS "next_follow_up_date" date,
      ADD COLUMN IF NOT EXISTS "preferred_staff_id" uuid,
      ADD COLUMN IF NOT EXISTS "last_visit_at" TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS "total_visits" integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);
    await queryRunner.query(`
      UPDATE "clients"
      SET
        "location_id" = COALESCE("location_id", "branch_id"),
        "branch_id" = COALESCE("branch_id", "location_id"),
        "name" = COALESCE(NULLIF("name", ''), "full_name", ''),
        "full_name" = COALESCE("full_name", NULLIF("name", '')),
        "phone_number" = COALESCE(NULLIF("phone_number", ''), "phone", ''),
        "phone" = COALESCE("phone", NULLIF("phone_number", '')),
        "updated_at" = COALESCE("updated_at", "created_at", NOW())
    `);
    await queryRunner.query(`ALTER TABLE "clients" ALTER COLUMN "location_id" SET NOT NULL`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.table_constraints
          WHERE constraint_name = 'uq_client_phone_location'
        ) THEN
          ALTER TABLE "clients"
          ADD CONSTRAINT "uq_client_phone_location" UNIQUE ("phone_number", "location_id");
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "client_problems" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
        "problem_name" text NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "appointments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "branch_id" uuid NOT NULL REFERENCES "branches"("id") ON DELETE CASCADE,
        "location_id" uuid REFERENCES "branches"("id") ON DELETE CASCADE,
        "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "client_id" uuid NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
        "staff_id" uuid REFERENCES "staff_members"("id") ON DELETE SET NULL,
        "service_id" uuid REFERENCES "services"("id") ON DELETE SET NULL,
        "appointment_at" TIMESTAMPTZ NOT NULL,
        "status" text NOT NULL CHECK ("status" IN ('scheduled', 'completed', 'cancelled', 'no_show')),
        "notes" text,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "appointments"
      ADD COLUMN IF NOT EXISTS "location_id" uuid,
      ADD COLUMN IF NOT EXISTS "user_id" uuid,
      ADD COLUMN IF NOT EXISTS "staff_id" uuid,
      ADD COLUMN IF NOT EXISTS "service_id" uuid,
      ADD COLUMN IF NOT EXISTS "notes" text,
      ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);
    await queryRunner.query(`UPDATE "appointments" SET "location_id" = COALESCE("location_id", "branch_id")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sales" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
        "branch_id" uuid NOT NULL REFERENCES "branches"("id") ON DELETE CASCADE,
        "location_id" uuid REFERENCES "branches"("id") ON DELETE CASCADE,
        "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "client_id" uuid REFERENCES "clients"("id") ON DELETE SET NULL,
        "appointment_id" uuid REFERENCES "appointments"("id") ON DELETE SET NULL,
        "amount" numeric(12,2) NOT NULL DEFAULT 0,
        "subtotal" numeric(12,2) NOT NULL DEFAULT 0,
        "discount" numeric(12,2) NOT NULL DEFAULT 0,
        "discount_type" text NOT NULL DEFAULT 'flat',
        "total_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "payment_method" text NOT NULL DEFAULT 'CASH',
        "paid_amount" numeric(12,2) NOT NULL DEFAULT 0,
        "sale_date" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await queryRunner.query(`
      ALTER TABLE "sales"
      ADD COLUMN IF NOT EXISTS "location_id" uuid,
      ADD COLUMN IF NOT EXISTS "user_id" uuid,
      ADD COLUMN IF NOT EXISTS "appointment_id" uuid,
      ADD COLUMN IF NOT EXISTS "amount" numeric(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "subtotal" numeric(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "discount" numeric(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "discount_type" text NOT NULL DEFAULT 'flat',
      ADD COLUMN IF NOT EXISTS "total_amount" numeric(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "paid_amount" numeric(12,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "sale_date" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);
    await queryRunner.query(`
      UPDATE "sales"
      SET
        "location_id" = COALESCE("location_id", "branch_id"),
        "amount" = COALESCE("amount", "total_amount", 0),
        "subtotal" = COALESCE(NULLIF("subtotal", 0), "amount", 0),
        "total_amount" = COALESCE(NULLIF("total_amount", 0), "amount", 0),
        "paid_amount" = COALESCE(NULLIF("paid_amount", 0), "amount", 0),
        "sale_date" = COALESCE("sale_date", "created_at", NOW()),
        "created_at" = COALESCE("created_at", "sale_date", NOW())
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'sales_payment_method_check'
        ) THEN
          ALTER TABLE "sales"
          ADD CONSTRAINT "sales_payment_method_check"
          CHECK ("payment_method" IN ('CASH', 'UPI', 'CARD'));
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sale_services" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "sale_id" uuid NOT NULL REFERENCES "sales"("id") ON DELETE CASCADE,
        "service_id" uuid NOT NULL REFERENCES "services"("id") ON DELETE CASCADE,
        "staff_id" uuid NOT NULL REFERENCES "staff_members"("id") ON DELETE CASCADE,
        "price" numeric(12,2) NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sale_products" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "sale_id" uuid NOT NULL REFERENCES "sales"("id") ON DELETE CASCADE,
        "product_id" uuid NOT NULL REFERENCES "inventory"("id") ON DELETE CASCADE,
        "quantity" numeric(12,2) NOT NULL,
        "price" numeric(12,2) NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "tenant_id" uuid REFERENCES "tenants"("id") ON DELETE SET NULL,
        "branch_id" uuid REFERENCES "branches"("id") ON DELETE SET NULL,
        "user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
        "action" text NOT NULL,
        "details" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sale_products"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sale_services"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sales"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "appointments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "client_problems"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "clients"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "staff_members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "service_products"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "services"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "inventory"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_sync_users_compat_columns ON "users"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_sync_branches_compat_columns ON "branches"`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_sync_tenants_compat_columns ON "tenants"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS sync_users_compat_columns()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS sync_branches_compat_columns()`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS sync_tenants_compat_columns()`);
  }
}

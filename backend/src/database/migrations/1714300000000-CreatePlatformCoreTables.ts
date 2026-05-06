import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlatformCoreTables1714300000000 implements MigrationInterface {
  name = 'CreatePlatformCoreTables1714300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenants_ownertype_enum') THEN
          CREATE TYPE "tenants_ownertype_enum" AS ENUM ('MULTI_BRANCH', 'INDEPENDENT');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenants_status_enum') THEN
          CREATE TYPE "tenants_status_enum" AS ENUM ('ACTIVE', 'TRIAL', 'EXPIRED');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
          CREATE TYPE "users_role_enum" AS ENUM ('SUPER_ADMIN', 'OWNER', 'MANAGER', 'INDEPENDENT_OWNER');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trials_status_enum') THEN
          CREATE TYPE "trials_status_enum" AS ENUM ('ACTIVE', 'EXPIRED', 'CONVERTED');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscriptions_plan_enum') THEN
          CREATE TYPE "subscriptions_plan_enum" AS ENUM ('STANDARD', 'PRO', 'CUSTOM');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscriptions_status_enum') THEN
          CREATE TYPE "subscriptions_status_enum" AS ENUM ('ACTIVE', 'EXPIRED');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'revenue_transactions_status_enum') THEN
          CREATE TYPE "revenue_transactions_status_enum" AS ENUM ('PAID', 'PENDING', 'FAILED', 'REFUNDED');
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'support_tickets_status_enum') THEN
          CREATE TYPE "support_tickets_status_enum" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenants" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "email" character varying(255) NOT NULL,
        "phone" character varying(20),
        "alternativePhone" character varying(20),
        "businessName" character varying(255) NOT NULL,
        "numberOfBranches" integer NOT NULL DEFAULT 1,
        "ownerType" "tenants_ownertype_enum" NOT NULL DEFAULT 'INDEPENDENT',
        "status" "tenants_status_enum" NOT NULL DEFAULT 'TRIAL',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenants_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_tenants_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "branches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "name" character varying(255) NOT NULL,
        "address" text,
        "phone" character varying(20),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_branches_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_branches_tenantId" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(255) NOT NULL,
        "email" character varying(255) NOT NULL,
        "phone" character varying(20),
        "shopName" character varying(255),
        "password" text NOT NULL,
        "role" "users_role_enum" NOT NULL DEFAULT 'OWNER',
        "tenantId" uuid,
        "branchId" uuid,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "isDefaultPassword" boolean NOT NULL DEFAULT false,
        "resetPasswordToken" character varying(255),
        "resetPasswordExpires" TIMESTAMP,
        "hasManager" boolean NOT NULL DEFAULT false,
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "FK_users_tenantId" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
        CONSTRAINT "FK_users_branchId" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "trials" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "startDate" date NOT NULL,
        "endDate" date NOT NULL,
        "status" "trials_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trials_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_trials_tenantId" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "plan" "subscriptions_plan_enum" NOT NULL DEFAULT 'STANDARD',
        "status" "subscriptions_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "amount_paid" numeric(10,2) NOT NULL DEFAULT 0,
        "payment_method" character varying(20),
        "transaction_reference" character varying(120),
        "startDate" date NOT NULL,
        "endDate" date NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_subscriptions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_subscriptions_tenantId" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "revenue_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "subscription_id" uuid,
        "amount" numeric(10,2) NOT NULL,
        "plan" character varying(20),
        "payment_method" character varying(20),
        "transaction_reference" character varying(120),
        "status" "revenue_transactions_status_enum" NOT NULL DEFAULT 'PAID',
        "description" character varying(100),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_revenue_transactions_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_revenue_transactions_tenantId" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_revenue_transactions_subscription_id" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "support_tickets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenantId" uuid NOT NULL,
        "issue" text NOT NULL,
        "description" text NOT NULL,
        "status" "support_tickets_status_enum" NOT NULL DEFAULT 'OPEN',
        "resolution" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_support_tickets_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_support_tickets_tenantId" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "action" character varying(100) NOT NULL,
        "performedBy" character varying(255) NOT NULL,
        "details" text,
        "ipAddress" character varying(45),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_logs_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "logs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "support_tickets"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "revenue_transactions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "subscriptions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "trials"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "branches"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenants"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "support_tickets_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "revenue_transactions_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "subscriptions_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "subscriptions_plan_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "trials_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tenants_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "tenants_ownertype_enum"`);
  }
}

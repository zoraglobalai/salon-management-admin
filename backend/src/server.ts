import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import type { Server } from 'http';
import { AppDataSource } from './database/config';
import app from './app';
import { query } from './database/pool';
import { verifyMailerConnection } from './shared/mail/mailer';

const DEFAULT_PORT = parseInt(process.env.PORT || '5000', 10);

const ensureSchemas = async () => {
  // Inventory Schema
  await query(`
    CREATE TABLE IF NOT EXISTS inventory (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'pcs',
      quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
      stock NUMERIC(12,2) NOT NULL DEFAULT 0,
      service_quantity NUMERIC(12,2) NOT NULL DEFAULT 0,
      benefits TEXT NOT NULL DEFAULT '',
      location_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS name TEXT`);
  await query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'pcs'`);
  await query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS quantity NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS stock NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS service_quantity NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS benefits TEXT NOT NULL DEFAULT ''`);
  await query(`ALTER TABLE inventory ADD COLUMN IF NOT EXISTS location_id UUID`);
  await query(`UPDATE inventory SET location_id = COALESCE(location_id, branch_id) WHERE location_id IS NULL`);
  await query(`ALTER TABLE inventory ALTER COLUMN location_id SET NOT NULL`);
  await query(`DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'inventory_location_id_fkey'
    ) THEN
      ALTER TABLE inventory
      ADD CONSTRAINT inventory_location_id_fkey
      FOREIGN KEY (location_id) REFERENCES branches(id) ON DELETE CASCADE;
    END IF;
  END $$`);

  // Services Schema
  await query(`
    CREATE TABLE IF NOT EXISTS services (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      location_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      price NUMERIC(12,2) NOT NULL DEFAULT 0,
      duration INTEGER NOT NULL DEFAULT 0,
      benefits TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  
  await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS tenant_id UUID`);
  await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS location_id UUID`);
  await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS benefits TEXT NOT NULL DEFAULT ''`);
  await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS price NUMERIC(12,2) NOT NULL DEFAULT 0`);
  await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS duration INTEGER NOT NULL DEFAULT 0`);
  await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  
  // Update location_id if it was created as branch_id in the past, and make legacy columns nullable
  await query(`DO $$
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name='services' AND column_name='branch_id'
    ) THEN
      UPDATE services SET location_id = branch_id WHERE location_id IS NULL;
      ALTER TABLE services ALTER COLUMN branch_id DROP NOT NULL;
    END IF;
    
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name='services' AND column_name='duration_minutes'
    ) THEN
      ALTER TABLE services ALTER COLUMN duration_minutes DROP NOT NULL;
    END IF;
    
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name='services' AND column_name='category'
    ) THEN
      ALTER TABLE services ALTER COLUMN category DROP NOT NULL;
    END IF;
  END $$`);

  // Service Products Schema
  await query(`
    CREATE TABLE IF NOT EXISTS service_products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
      quantity_used NUMERIC(12,2) NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'pcs'
    )
  `);

  // Staff Members Schema
  await query(`
    CREATE TABLE IF NOT EXISTS staff_members (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      location_id  UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      name         TEXT NOT NULL,
      role         TEXT NOT NULL DEFAULT '',
      phone_number TEXT NOT NULL DEFAULT '',
      state        TEXT NOT NULL DEFAULT '',
      city         TEXT NOT NULL DEFAULT '',
      address_line TEXT NOT NULL DEFAULT '',
      bank_name    TEXT NOT NULL DEFAULT '',
      account_number TEXT NOT NULL DEFAULT '',
      ifsc_code    TEXT NOT NULL DEFAULT '',
      id_type      TEXT NOT NULL DEFAULT '',
      id_number    TEXT NOT NULL DEFAULT '',
      joining_date DATE,
      notes        TEXT NOT NULL DEFAULT '',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT ''`);
  await query(`ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS joining_date DATE`);

  // Clients Table Columns
  await query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT ''`);
  await query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone_number TEXT NOT NULL DEFAULT ''`);
  await query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS hair_type TEXT NOT NULL DEFAULT 'Normal'`);
  await query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT ''`);
  await query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS tag TEXT NOT NULL DEFAULT 'NEW'`);
  await query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS next_follow_up_date DATE`);
  await query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS preferred_staff_id UUID`);
  await query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
  await query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS total_visits INTEGER NOT NULL DEFAULT 0`);
  await query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_visit_at TIMESTAMPTZ`);
  await query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS tenant_id UUID`);
  await query(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS location_id UUID`);

  // Data Migration for Clients
  await query(`DO $$
  BEGIN
    -- Rename branch_id -> location_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='branch_id') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='location_id') THEN
      ALTER TABLE clients RENAME COLUMN branch_id TO location_id;
    END IF;

    -- Rename full_name -> name
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='full_name') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='name') THEN
      ALTER TABLE clients RENAME COLUMN full_name TO name;
    END IF;

    -- Rename phone -> phone_number
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='phone') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clients' AND column_name='phone_number') THEN
      ALTER TABLE clients RENAME COLUMN phone TO phone_number;
    END IF;

    -- Ensure NOT NULL and UNIQUE constraints
    ALTER TABLE clients ALTER COLUMN tenant_id SET NOT NULL;
    ALTER TABLE clients ALTER COLUMN location_id SET NOT NULL;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='uq_client_phone_location') THEN
      ALTER TABLE clients ADD CONSTRAINT uq_client_phone_location UNIQUE (phone_number, location_id);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Clients migration issue: %', SQLERRM;
  END $$`);

  // Client Problems Schema
  await query(`
    CREATE TABLE IF NOT EXISTS client_problems (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      problem_name TEXT NOT NULL
    )
  `);

  // Sales Schema
  await query(`
    CREATE TABLE IF NOT EXISTS sales (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      location_id     UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
      discount        NUMERIC(12,2) NOT NULL DEFAULT 0,
      discount_type   TEXT NOT NULL DEFAULT 'flat',
      total_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
      payment_method  TEXT NOT NULL CHECK (payment_method IN ('CASH', 'UPI', 'CARD')),
      paid_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS sale_services (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sale_id     UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      service_id  UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      staff_id    UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
      price       NUMERIC(12,2) NOT NULL
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS sale_products (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sale_id     UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id  UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
      quantity    NUMERIC(12,2) NOT NULL,
      price       NUMERIC(12,2) NOT NULL
    )
  `);
};

const listenOnPort = (port: number): Server => {
  const server = app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      const nextPort = port + 1;
      console.warn(`Port ${port} is already in use. Retrying on ${nextPort}...`);
      listenOnPort(nextPort);
      return;
    }

    console.error('Server startup failed:', error);
    process.exit(1);
  });

  return server;
};

AppDataSource.initialize()
  .then(async () => {
    console.log('Database connected successfully');
    await ensureSchemas();
    await verifyMailerConnection();
    listenOnPort(DEFAULT_PORT);
  })
  .catch((error) => {
    console.error('Database connection failed:', error);
    process.exit(1);
  });

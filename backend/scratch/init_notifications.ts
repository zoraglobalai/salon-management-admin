import { query } from "../src/database/pool";

async function createNotificationsTable() {
  console.log("Creating notifications table...");
  
  const sql = `
    CREATE TYPE "notification_category_enum" AS ENUM (
      'REVENUE', 'STAFF', 'SERVICE', 'CUSTOMER', 'BRANCH', 'INVENTORY'
    );

    CREATE TABLE IF NOT EXISTS "notifications" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" uuid NOT NULL,
      "role" varchar(50) NOT NULL,
      "type" varchar(100) NOT NULL,
      "title" varchar(255) NOT NULL,
      "message" text NOT NULL,
      "category" "notification_category_enum" DEFAULT 'REVENUE',
      "metadata" jsonb,
      "is_read" boolean DEFAULT false,
      "created_at" TIMESTAMP DEFAULT now(),
      "updated_at" TIMESTAMP DEFAULT now(),
      CONSTRAINT "fk_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS "idx_notifications_user_role" ON "notifications" ("user_id", "role");
    CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON "notifications" ("created_at" DESC);
  `;

  try {
    await query(sql, []);
    console.log("Notifications table created successfully.");
  } catch (err: any) {
    console.error("Error creating notifications table:", err);
    // If enum already exists, try creating the table without the enum creation
    if (err.message.includes("already exists")) {
       const sqlTableOnly = `
        CREATE TABLE IF NOT EXISTS "notifications" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "user_id" uuid NOT NULL,
          "role" varchar(50) NOT NULL,
          "type" varchar(100) NOT NULL,
          "title" varchar(255) NOT NULL,
          "message" text NOT NULL,
          "category" "notification_category_enum" DEFAULT 'REVENUE',
          "metadata" jsonb,
          "is_read" boolean DEFAULT false,
          "created_at" TIMESTAMP DEFAULT now(),
          "updated_at" TIMESTAMP DEFAULT now(),
          CONSTRAINT "fk_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS "idx_notifications_user_role" ON "notifications" ("user_id", "role");
        CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON "notifications" ("created_at" DESC);
      `;
      await query(sqlTableOnly, []);
      console.log("Notifications table created successfully (enum existed).");
    }
  }
}

createNotificationsTable().then(() => process.exit(0)).catch(() => process.exit(1));

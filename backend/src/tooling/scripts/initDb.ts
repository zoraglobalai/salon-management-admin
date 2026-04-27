import { pool } from "../../database/pool";
import { schemaSql } from "../../database/schema";

async function initDb() {
  try {
    const statements = schemaSql
      .split(";")
      .map((statement) => statement.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await pool.query(statement);
    }

    console.log("Database schema created successfully.");
  } catch (error) {
    console.error("Failed to initialize database.", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

initDb();

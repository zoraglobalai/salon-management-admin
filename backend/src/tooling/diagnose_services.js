const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'groomvy',
  user: 'postgres',
  password: 'zora',
});

async function run() {
  try {
    // Check services columns
    const svc = await pool.query(
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'services' ORDER BY ordinal_position"
    );
    console.log('\n=== SERVICES COLUMNS ===');
    svc.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type}) nullable=${r.is_nullable}`));

    // Check inventory columns
    const inv = await pool.query(
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inventory' ORDER BY ordinal_position"
    );
    console.log('\n=== INVENTORY COLUMNS ===');
    inv.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type}) nullable=${r.is_nullable}`));

    // Check branches columns
    const br = await pool.query(
      "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'branches' ORDER BY ordinal_position"
    );
    console.log('\n=== BRANCHES COLUMNS ===');
    br.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type}) nullable=${r.is_nullable}`));

    // Try the actual listServices query that's failing (with a fake tenant_id)
    const testQuery = await pool.query(
      "SELECT s.id, s.name, s.price, COALESCE(s.duration, 0) AS duration, COALESCE(s.benefits, '') AS benefits, COALESCE(s.location_id, s.branch_id) AS location_id, s.created_at, s.updated_at FROM services s WHERE s.tenant_id = $1 ORDER BY s.created_at DESC LIMIT 1",
      ['00000000-0000-0000-0000-000000000001']
    );
    console.log('\n=== TEST QUERY OK, rows:', testQuery.rowCount);

  } catch (err) {
    console.error('\n!!! QUERY FAILED:', err.message);
    console.error('Code:', err.code);
    console.error('Detail:', err.detail);
    console.error('Hint:', err.hint);
  } finally {
    await pool.end();
  }
}

run();

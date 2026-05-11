/**
 * Diagnostic: test the actual listServices query path
 * Run: node src/tooling/diagnose_query.js <tenant_id>
 */
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'groomvy',
  user: 'postgres',
  password: 'zora',
});

async function run() {
  const tenantId = process.argv[2];

  try {
    // Step 1: List all tenants
    const tenants = await pool.query('SELECT id, name FROM tenants LIMIT 10');
    console.log('\n=== TENANTS ===');
    tenants.rows.forEach(r => console.log(`  ${r.id}  ${r.name}`));

    // Step 2: Use first tenant if none passed
    const tid = tenantId || tenants.rows[0]?.id;
    if (!tid) {
      console.log('No tenants found!');
      return;
    }
    console.log(`\nUsing tenant_id: ${tid}`);

    // Step 3: Check branches for this tenant
    const branches = await pool.query(
      'SELECT id, name, tenant_id, "tenantId" FROM branches WHERE tenant_id = $1 OR "tenantId" = $1 LIMIT 5',
      [tid]
    );
    console.log('\n=== BRANCHES ===');
    branches.rows.forEach(r =>
      console.log(`  id=${r.id} name=${r.name} tenant_id=${r.tenant_id} tenantId=${r.tenantId}`)
    );

    // Step 4: Run exact listServices query
    const result = await pool.query(
      `SELECT
        s.id, s.name, s.price,
        COALESCE(s.duration, 0) AS duration,
        COALESCE(s.benefits, '') AS benefits,
        COALESCE(s.location_id, s.branch_id) AS location_id,
        s.created_at,
        s.updated_at
      FROM services s
      WHERE s.tenant_id = $1
      ORDER BY s.created_at DESC`,
      [tid]
    );
    console.log(`\n=== SERVICES QUERY OK: ${result.rowCount} row(s) ===`);
    result.rows.slice(0, 3).forEach(r => console.log(`  ${r.id} - ${r.name}`));

    // Step 5: Check service_consumables join
    if (result.rowCount > 0) {
      const serviceIds = result.rows.map(r => r.id);
      const products = await pool.query(
        `SELECT sc.id, sc.service_id, sc.inventory_item_id, sc.consumption_quantity, sc.consumption_unit,
                i.name AS product_name,
                COALESCE(i.service_quantity, 0) AS product_stock
         FROM service_consumables sc
         INNER JOIN inventory i ON i.id = sc.inventory_item_id
         WHERE sc.service_id = ANY($1::uuid[])`,
        [serviceIds]
      );
      console.log(`\n=== SERVICE_CONSUMABLES JOIN OK: ${products.rowCount} row(s) ===`);
    }

  } catch (err) {
    console.error('\n!!! FAILED AT STEP:', err.message);
    console.error('PG Code:', err.code);
    console.error('Detail:', err.detail);
    console.error('Hint:', err.hint);
    console.error('Position:', err.position);
  } finally {
    await pool.end();
  }
}

run();

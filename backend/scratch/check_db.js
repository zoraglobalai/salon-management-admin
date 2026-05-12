const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function checkTables() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('conversations', 'messages', 'message_reads');
    `);
    console.log('Existing tables:', res.rows.map(r => r.table_name));
    
    if (res.rows.find(r => r.table_name === 'conversations')) {
       const cols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'conversations'");
       console.log('Conversations columns:', cols.rows);
    }
    
    if (res.rows.find(r => r.table_name === 'messages')) {
       const cols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'messages'");
       console.log('Messages columns:', cols.rows);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkTables();

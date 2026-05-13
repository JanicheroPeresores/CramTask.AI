require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

(async () => {
  try {
    const res = await pool.query('SELECT count(*) as c FROM users');
    console.log('users count:', res.rows[0].c);
    const r2 = await pool.query('SELECT id, username, email FROM users ORDER BY id DESC LIMIT 5');
    console.log(JSON.stringify(r2.rows));
  } catch (e) {
    console.error('ERROR', e);
  } finally {
    await pool.end();
  }
})();

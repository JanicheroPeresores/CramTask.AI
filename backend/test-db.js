const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function test() {
  try {
    // Test connection
    const res = await pool.query('SELECT NOW()');
    console.log('Database connected successfully:', res.rows[0]);

    // Check if users table exists
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'users'
    `);

    if (tables.rows.length > 0) {
      console.log('Users table exists');

      // Check if there are any users
      const users = await pool.query('SELECT COUNT(*) as count FROM users');
      console.log('Number of users:', users.rows[0].count);
    } else {
      console.log('Users table does not exist');
    }

  } catch (err) {
    console.error('Database error:', err);
  } finally {
    pool.end();
  }
}

test();
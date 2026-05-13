const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

let sql = null;

const stripQuotes = (value) => {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/^["']|["']$/g, '');
};

const buildCandidates = (connectionString) => {
  const cs = stripQuotes(connectionString);
  const trimmed = typeof cs === 'string' ? cs.trim() : cs;
  if (!trimmed) return [];

  const candidates = [trimmed];

  // Try common Supabase port differences.
  // Supabase connection strings are typically 6543, but some setups use 5432.
  if (trimmed.includes(':5432/')) {
    candidates.push(trimmed.replace(':5432/', ':6543/'));
  } else if (trimmed.includes(':6543/')) {
    candidates.push(trimmed.replace(':6543/', ':5432/'));
  }

  return [...new Set(candidates)];
};

const createPool = (connectionString) => {
  const cs = stripQuotes(connectionString);

  return new Pool({
    connectionString: cs,
    ssl: typeof cs === 'string' && cs.includes('localhost')
      ? false
      : {
          rejectUnauthorized: false,
        },
  });
};

const getDatabase = () => {
  if (sql) return Promise.resolve(sql);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL environment variable is not set. Add a database connection string.'
    );
  }

  if (databaseUrl.startsWith('sqlite://')) {
    // SQLite setup
    const dbPath = databaseUrl.replace('sqlite://', '');
    return open({
      filename: dbPath,
      driver: sqlite3.Database,
    }).then(db => {
      sql = async (query, params = []) => {
        const result = await db.all(query, params);
        return result;
      };
      return sql;
    });
  } else {
    // PostgreSQL setup
    const candidates = buildCandidates(databaseUrl);
    if (!candidates.length) {
      throw new Error('DATABASE_URL could not be processed into a valid connection string.');
    }

    sql = async (query, params = []) => {
      let lastErr = null;

      for (const cs of candidates) {
        const safeCs = typeof cs === 'string' ? cs.replace(/\/\/([^:]+):([^@]+)@/,'//$1:***@') : cs;

        try {
          const pool = createPool(cs);
          const result = await pool.query(query, params);
          await pool.end().catch(() => {});
          return result.rows;
        } catch (e) {
          lastErr = e;
          // Useful for deployed logs; avoids leaking passwords.
          console.error('[db] query failed; candidate:', safeCs, 'error:', e && e.message ? e.message : String(e));
        }
      }

      throw lastErr || new Error('Database connection failed');
    };

    return Promise.resolve(sql);
  }
};

const initDatabase = async () => {
  const sql = await getDatabase();
  const isSQLite = process.env.DATABASE_URL.startsWith('sqlite://');

  // Adjust SQL syntax based on database type
  const serialType = isSQLite ? 'INTEGER PRIMARY KEY AUTOINCREMENT' : 'SERIAL PRIMARY KEY';
  const timestampType = isSQLite ? 'DATETIME' : 'TIMESTAMP';
  const ifNotExists = 'IF NOT EXISTS'; // Both PostgreSQL and SQLite support this

  await sql(`CREATE TABLE ${ifNotExists} users (
    id ${serialType},
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    reset_token TEXT,
    reset_token_expires ${timestampType},
    created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP
  )`);

  await sql(`CREATE TABLE ${ifNotExists} tasks (
    id ${serialType},
    user_id INTEGER NOT NULL REFERENCES users(id),
    task_name TEXT NOT NULL,
    task_description TEXT,
    deadline ${timestampType},
    priority TEXT DEFAULT 'medium',
    importance REAL DEFAULT 5,
    urgency REAL DEFAULT 5,
    priority_score REAL DEFAULT 5,
    category TEXT DEFAULT NULL,
    status TEXT DEFAULT 'pending',
    created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP
  )`);

  // Add priority column if missing (existing databases)
  try {
    await sql(`ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'medium'`);
  } catch (e) {}

  // Add category column if missing (existing databases)
  try {
    await sql(`ALTER TABLE tasks ADD COLUMN category TEXT DEFAULT NULL`);
  } catch (e) {}

  // Add priority score inputs if missing (existing databases)
  try {
    await sql(`ALTER TABLE tasks ADD COLUMN importance REAL DEFAULT 5`);
    await sql(`ALTER TABLE tasks ADD COLUMN urgency REAL DEFAULT 5`);
    await sql(`ALTER TABLE tasks ADD COLUMN priority_score REAL DEFAULT 5`);
  } catch (e) {}

  // Add deadline_notified column if missing (existing databases)
  try {
    await sql(`ALTER TABLE tasks ADD COLUMN deadline_notified BOOLEAN DEFAULT false`);
  } catch (e) {}

  // Add reset token columns if missing (existing databases)
  try {
    await sql(`ALTER TABLE users ADD COLUMN reset_token TEXT`);
    await sql(`ALTER TABLE users ADD COLUMN reset_token_expires ${timestampType}`);
  } catch (e) {}

  // Create assignments table
  await sql(`CREATE TABLE ${ifNotExists} assignments (
    id ${serialType},
    user_id INTEGER NOT NULL REFERENCES users(id),
    course TEXT NOT NULL,
    assignment_title TEXT NOT NULL,
    due_date ${timestampType},
    subject TEXT,
    priority TEXT DEFAULT 'medium',
    submission_status TEXT DEFAULT 'not_submitted',
    description TEXT,
    created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
    updated_at ${timestampType} DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create Google Classroom credentials table
  await sql(`CREATE TABLE ${ifNotExists} google_classroom_credentials (
    id ${serialType},
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expiry ${timestampType},
    created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
    updated_at ${timestampType} DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create Google Classroom assignments table
  await sql(`CREATE TABLE ${ifNotExists} google_classroom_assignments (
    id ${serialType},
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    google_classroom_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    course_name TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date ${timestampType},
    due_time TEXT,
    state TEXT,
    alternate_link TEXT,
    last_synced ${timestampType} DEFAULT CURRENT_TIMESTAMP,
    created_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
    updated_at ${timestampType} DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, google_classroom_id)
  )`);

  console.log('Database initialized successfully');
};

const saveDatabase = () => {};

module.exports = {
  getDatabase,
  initDatabase,
  saveDatabase,
};

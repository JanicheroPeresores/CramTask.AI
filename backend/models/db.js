const { neon } = require('@neondatabase/serverless');

let sql = null;

const getDatabase = () => {
  if (sql) return Promise.resolve(sql);

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set. Get one free at https://neon.tech');
  }

  sql = neon(connectionString);
  return Promise.resolve(sql);
};

const initDatabase = async () => {
  const sql = await getDatabase();

  await sql(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    reset_token TEXT,
    reset_token_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await sql(`CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    task_name TEXT NOT NULL,
    task_description TEXT,
    deadline TIMESTAMP,
    priority TEXT DEFAULT 'medium',
    importance REAL DEFAULT 5,
    urgency REAL DEFAULT 5,
    priority_score REAL DEFAULT 5,
    category TEXT DEFAULT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  // Add priority column if missing (existing databases)
  try {
    await sql(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium'`);
  } catch(e) {}

  // Add category column if missing (existing databases)
  try {
    await sql(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category TEXT DEFAULT NULL`);
  } catch(e) {}

  // Add priority score inputs if missing (existing databases)
  try {
    await sql(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS importance REAL DEFAULT 5`);
    await sql(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS urgency REAL DEFAULT 5`);
    await sql(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority_score REAL DEFAULT 5`);
  } catch(e) {}

  // Add deadline_notified column if missing (existing databases)
  try {
    await sql(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deadline_notified BOOLEAN DEFAULT false`);
  } catch(e) {}

  // Add reset token columns if missing (existing databases)
  try {
    await sql(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT`);
    await sql(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP`);
  } catch(e) {}

  // Create assignments table for school assignments
  await sql(`CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    course TEXT NOT NULL,
    assignment_title TEXT NOT NULL,
    due_date TIMESTAMP,
    subject TEXT,
    priority TEXT DEFAULT 'medium',
    submission_status TEXT DEFAULT 'not_submitted',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  try {
    await sql(`ALTER TABLE assignments ALTER COLUMN submission_status SET DEFAULT 'not_submitted'`);
  } catch(e) {}

  console.log('Database initialized successfully');
};

const saveDatabase = () => {};

module.exports = {
  getDatabase,
  initDatabase,
  saveDatabase
};

const path = require('path');
const express = require('express');
const cors = require('cors');

/**
 * Local dev: load backend/.env if it exists.
 * Vercel: environment variables are injected automatically, no .env file is present.
 */
const envPath = path.join(__dirname, '../backend/.env');
try {
  require('dotenv').config({ path: envPath, override: false });
} catch {
  // dotenv optional in Vercel
}

const { initDatabase } = require('../backend/models/db');
const authRoutes = require('../backend/routes/auth');
const taskRoutes = require('../backend/routes/tasks');
const assignmentRoutes = require('../backend/routes/assignments');
const googleClassroomRoutes = require('../backend/routes/googleClassroom');

const app = express();

// Initialize database tables on first request
let dbInitialized = false;
app.use(async (req, res, next) => {
  // Skip DB init for these endpoints so we can inspect runtime env safely
  if (req.path === '/api/health' || req.path === '/api/debug-env') {
    return next();
  }

  if (!dbInitialized) {
    try {
      await initDatabase();
      dbInitialized = true;
    } catch (err) {
      console.error('Database init error:', err.message, err.stack);
      const databaseUrl = process.env.DATABASE_URL;

      if (!databaseUrl) {
        console.error('DATABASE_URL set:', false);
      } else {
        try {
          const u = new URL(databaseUrl);
          // don’t print user/pass; just print host (and port if present)
          console.error('DATABASE_URL set:', true);
          console.error('DATABASE host:', u.host);
        } catch (parseErr) {
          console.error('DATABASE_URL set:', true);
          console.error('DATABASE_URL parse error:', (parseErr && parseErr.message) ? parseErr.message : String(parseErr));
        }
      }

      let databaseHost = null;

      try {
        const databaseUrl = process.env.DATABASE_URL;
        if (databaseUrl) {
          const u = new URL(databaseUrl);
          databaseHost = u.host;
        }
      } catch {
        // ignore parse errors here
      }

      return res.status(500).json({
        message: 'Database connection failed',
        error: err.message,
        databaseHost,
      });
    }
  }
  next();
});

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/google-classroom', googleClassroomRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', env: process.env.NODE_ENV || 'development' });
});

// Debug env (temporary) to confirm which env vars are available in Vercel runtime
app.get('/api/debug-env', (req, res) => {
  const keys = Object.keys(process.env || {});
  const databaseKeys = keys.filter(k => k.toLowerCase().includes('database'));
  const databaseUrl = process.env.DATABASE_URL;

  let databaseHost = null;
  try {
    if (databaseUrl) {
      const u = new URL(databaseUrl);
      databaseHost = u.host;
    }
  } catch {
    databaseHost = 'parse-error';
  }

  const databaseUrlStr = typeof databaseUrl === 'string' ? databaseUrl : '';
  // show a safe prefix only (avoid credentials by not printing the whole string)
  const databaseUrlPrefix = databaseUrlStr.length > 35 ? `${databaseUrlStr.slice(0, 35)}…` : databaseUrlStr;
  const startsWithPostgres = databaseUrlStr.startsWith('postgresql://') || databaseUrlStr.startsWith('postgres://');
  const databaseUrlHasAt = databaseUrlStr.includes('@');

  res.json({
    hasDatabaseUrl: typeof databaseUrlStr === 'string' && databaseUrlStr.length > 0,
    databaseUrlLen: databaseUrlStr.length,
    databaseKeys,
    databaseHost,
    startsWithPostgres,
    databaseUrlHasAt,
    databaseUrlPrefix,
  });
});

// Explicitly test DB init in Vercel runtime (returns detailed error)
app.get('/api/debug-init-db', async (req, res) => {
  try {
    await initDatabase();
    res.status(200).json({ ok: true });
  } catch (err) {
    let databaseHost = null;
    const databaseUrl = process.env.DATABASE_URL;

    try {
      if (databaseUrl) {
        const u = new URL(databaseUrl);
        databaseHost = u.host;
      }
    } catch {
      // ignore
    }

    res.status(500).json({
      ok: false,
      error: err && err.message ? err.message : String(err),
      databaseHost,
    });
  }
});

// Export for Vercel serverless
module.exports = app;

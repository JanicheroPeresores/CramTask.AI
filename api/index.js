const path = require('path');
const express = require('express');
const cors = require('cors');
const dns = require('dns');

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

// If DATABASE_URL is present but clearly not a postgres URL (e.g. someone accidentally set it),
// attempt to load backend/.env as a fallback. Vercel includes backend/** via vercel.json.
if (typeof process.env.DATABASE_URL === 'string') {
  const v = process.env.DATABASE_URL.trim();
  const looksLikePostgres = v.startsWith('postgresql://') || v.startsWith('postgres://');
  if (!looksLikePostgres) {
    try {
      require('dotenv').config({ path: envPath, override: true });
    } catch {
      // ignore
    }
  }
}

const { initDatabase } = require('../backend/models/db');
const authRoutes = require('../backend/routes/auth');
const taskRoutes = require('../backend/routes/tasks');
const assignmentRoutes = require('../backend/routes/assignments');
const googleClassroomRoutes = require('../backend/routes/googleClassroom');
const aiAgentRoutes = require('../backend/routes/aiAgent');

const app = express();

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', env: process.env.NODE_ENV || 'development' });
});

// Debug env (temporary)
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
  const databaseUrlPrefix = databaseUrlStr.length > 35 ? `${databaseUrlStr.slice(0, 35)}…` : databaseUrlStr;
  const startsWithPostgres = databaseUrlStr.startsWith('postgresql://') || databaseUrlStr.startsWith('postgres://');

  res.json({
    hasDatabaseUrl: typeof databaseUrlStr === 'string' && databaseUrlStr.length > 0,
    databaseUrlLen: databaseUrlStr.length,
    databaseKeys,
    databaseHost,
    startsWithPostgres,
    databaseUrlPrefix,
  });
});

app.get('/api/debug-dns-db', async (req, res) => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return res.json({ ok: false, reason: 'DATABASE_URL missing' });
  }

  let hostname = null;
  try {
    const u = new URL(databaseUrl);
    hostname = u.hostname;
  } catch {
    return res.json({ ok: false, reason: 'DATABASE_URL parse failed' });
  }

  return new Promise((resolve) => {
    dns.lookup(hostname, { all: true }, (err, addresses) => {
      if (err) {
        return resolve(res.json({ ok: false, hostname, dnsError: err.message }));
      }
      return resolve(res.json({ ok: true, hostname, addresses }));
    });
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
    } catch {}

    res.status(500).json({
      ok: false,
      error: err && err.message ? err.message : String(err),
      databaseHost,
    });
  }
});

// Initialize database tables on first request
let dbInitialized = false;
app.use(async (req, res, next) => {
  console.log('[db-middleware] path:', req.path, 'url:', req.url, 'originalUrl:', req.originalUrl);

  const originalUrl = typeof req.originalUrl === 'string' ? req.originalUrl : '';
  const url = typeof req.url === 'string' ? req.url : '';
  const path = typeof req.path === 'string' ? req.path : '';

  const isDebugRoute =
    originalUrl.startsWith('/api/debug') ||
    url.includes('/api/debug') ||
    path.startsWith('/api/debug');

  if (req.path === '/api/health' || req.path === '/api/debug-env' || isDebugRoute) {
    return next();
  }

  if (!dbInitialized) {
    try {
      await initDatabase();
      dbInitialized = true;
    } catch (err) {
      const databaseUrl = process.env.DATABASE_URL;

      let databaseHost = null;
      try {
        if (databaseUrl) {
          const u = new URL(databaseUrl);
          databaseHost = u.host;
        }
      } catch {}

      return res.status(500).json({
        message: 'Database connection failed',
        error: err && err.message ? err.message : String(err),
        databaseHost,
      });
    }
  }
  next();
});

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/google-classroom', googleClassroomRoutes);
app.use('/api/ai', aiAgentRoutes);

// Export for Vercel serverless
module.exports = app;

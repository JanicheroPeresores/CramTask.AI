const path = require('path');
const express = require('express');
const cors = require('cors');

// Load .env file for local dev; on Vercel env vars are injected automatically
const envPath = path.join(__dirname, '../backend/.env');
try { require('dotenv').config({ path: envPath }); } catch (e) { /* dotenv optional */ }

const { initDatabase } = require('../backend/models/db');
const authRoutes = require('../backend/routes/auth');
const taskRoutes = require('../backend/routes/tasks');
const assignmentRoutes = require('../backend/routes/assignments');
const googleClassroomRoutes = require('../backend/routes/googleClassroom');

const app = express();

// Initialize database tables on first request
let dbInitialized = false;
app.use(async (req, res, next) => {
  if (!dbInitialized) {
    try {
      await initDatabase();
      dbInitialized = true;
    } catch (err) {
      console.error('Database init error:', err.message, err.stack);
      console.error('DATABASE_URL set:', !!process.env.DATABASE_URL);
      return res.status(500).json({ message: 'Database connection failed', error: err.message });
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

// Export for Vercel serverless
module.exports = app;

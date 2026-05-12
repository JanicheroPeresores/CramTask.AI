const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { initDatabase } = require('./models/db');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const assignmentRoutes = require('./routes/assignments');
const googleClassroomRoutes = require('./routes/googleClassroom');
const aiAgentRoutes = require('./routes/aiAgent');
const Task = require('./models/Task');
const Assignment = require('./models/Assignment');
const { sendDeadlineReminderEmail } = require('./utils/email');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/google-classroom', googleClassroomRoutes);
app.use('/api/ai', aiAgentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Serve React frontend in production
const frontendBuildPath = path.join(__dirname, '../frontend/build');
app.use(express.static(frontendBuildPath));

// Any non-API route serves the React app (for client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;

// Check for tasks with deadlines within 24 hours and send reminder emails
async function checkDeadlineReminders() {
  try {
    const tasks = await Task.getUpcomingDeadlines();
    for (const task of tasks) {
      try {
        await sendDeadlineReminderEmail(task.email, task);
        await Task.markDeadlineNotified(task.id);
        console.log(`Deadline reminder sent for task ${task.id} to ${task.email}`);
      } catch (err) {
        console.error(`Failed to send deadline reminder for task ${task.id}:`, err);
      }
    }
  } catch (err) {
    console.error('Error checking deadline reminders:', err);
  }
}

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    // Run deadline check every hour
    setInterval(checkDeadlineReminders, 60 * 60 * 1000);
    // Also run once on startup
    checkDeadlineReminders();
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

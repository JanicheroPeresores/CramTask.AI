const { getDatabase } = require('./db');

const normalizeScoreInput = (value, fallback = 5) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

const calculatePriorityScore = (importance, urgency) => {
  return (importance * 0.7) + (urgency * 0.3);
};

const Task = {
  create: async (userId, taskName, taskDescription, deadline, priority, category, importance, urgency) => {
    const sql = await getDatabase();
    const p = priority || 'medium';
    const d = deadline || null;
    const c = category || null;
    const i = normalizeScoreInput(importance);
    const u = normalizeScoreInput(urgency);
    const score = calculatePriorityScore(i, u);
    const rows = await sql(
      'INSERT INTO tasks (user_id, task_name, task_description, deadline, priority, importance, urgency, priority_score, category) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id',
      [userId, taskName, taskDescription || null, d, p, i, u, score, c]
    );
    const id = rows[0].id;
    return { id, userId, taskName, taskDescription, deadline, priority: p, importance: i, urgency: u, priority_score: score, category: c };
  },

  getByUserId: async (userId) => {
    const sql = await getDatabase();
    return await sql('SELECT * FROM tasks WHERE user_id = $1 ORDER BY deadline', [userId]);
  },

  update: async (taskId, taskName, taskDescription, deadline, status, priority, category, importance, urgency) => {
    const sql = await getDatabase();
    const p = priority || 'medium';
    const d = deadline || null;
    const c = category || null;
    const i = normalizeScoreInput(importance);
    const u = normalizeScoreInput(urgency);
    const score = calculatePriorityScore(i, u);
    await sql(
      'UPDATE tasks SET task_name = $1, task_description = $2, deadline = $3, status = $4, priority = $5, importance = $6, urgency = $7, priority_score = $8, category = $9 WHERE id = $10',
      [taskName, taskDescription || null, d, status, p, i, u, score, c, taskId]
    );
  },

  delete: async (taskId) => {
    const sql = await getDatabase();
    await sql('DELETE FROM tasks WHERE id = $1', [taskId]);
  },

  getUpcomingDeadlines: async () => {
    const sql = await getDatabase();
    const isSQLite = process.env.DATABASE_URL.startsWith('sqlite://');
    
    const now = isSQLite ? "datetime('now')" : 'NOW()';
    const oneDayLater = isSQLite ? "datetime('now', '+1 day')" : "NOW() + INTERVAL '1 day'";
    
    return await sql(
      `SELECT t.*, u.email FROM tasks t
       JOIN users u ON t.user_id = u.id
       WHERE t.deadline IS NOT NULL
         AND t.status != 'completed'
         AND t.deadline_notified = false
         AND t.deadline > ${now}
         AND t.deadline <= ${oneDayLater}`
    );
  },

  markDeadlineNotified: async (taskId) => {
    const sql = await getDatabase();
    await sql('UPDATE tasks SET deadline_notified = true WHERE id = $1', [taskId]);
  }
};

module.exports = Task;

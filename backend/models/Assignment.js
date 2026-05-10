const { getDatabase } = require('./db');

const Assignment = {
  create: async (userId, course, assignmentTitle, dueDate, subject, priority, submissionStatus, description) => {
    const sql = await getDatabase();
    const p = priority || 'medium';
    const s = subject || null;
    const dd = dueDate || null;
    const ss = submissionStatus || 'not_submitted';
    const desc = description || null;
    
    const rows = await sql(
      'INSERT INTO assignments (user_id, course, assignment_title, due_date, subject, priority, description, submission_status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [userId, course, assignmentTitle, dd, s, p, desc, ss]
    );
    
    return rows[0];
  },

  getByUserId: async (userId) => {
    const sql = await getDatabase();
    return await sql(
      'SELECT * FROM assignments WHERE user_id = $1 ORDER BY due_date ASC',
      [userId]
    );
  },

  getById: async (assignmentId) => {
    const sql = await getDatabase();
    const rows = await sql(
      'SELECT * FROM assignments WHERE id = $1',
      [assignmentId]
    );
    return rows.length > 0 ? rows[0] : null;
  },

  update: async (assignmentId, course, assignmentTitle, dueDate, subject, priority, submissionStatus, description) => {
    const sql = await getDatabase();
    const p = priority || 'medium';
    const s = subject || null;
    const dd = dueDate || null;
    const desc = description || null;
    const ss = submissionStatus || 'not_submitted';
    
    await sql(
      'UPDATE assignments SET course = $1, assignment_title = $2, due_date = $3, subject = $4, priority = $5, submission_status = $6, description = $7, updated_at = CURRENT_TIMESTAMP WHERE id = $8',
      [course, assignmentTitle, dd, s, p, ss, desc, assignmentId]
    );
  },

  delete: async (assignmentId) => {
    const sql = await getDatabase();
    await sql('DELETE FROM assignments WHERE id = $1', [assignmentId]);
  },

  getUpcomingDeadlines: async () => {
    const sql = await getDatabase();
    return await sql(
      `SELECT a.*, u.email FROM assignments a
       JOIN users u ON a.user_id = u.id
       WHERE a.due_date IS NOT NULL
         AND a.submission_status != 'submitted'
         AND a.due_date > NOW()
         AND a.due_date <= NOW() + INTERVAL '1 day'`
    );
  },

  getByStatus: async (userId, status) => {
    const sql = await getDatabase();
    return await sql(
      'SELECT * FROM assignments WHERE user_id = $1 AND submission_status = $2 ORDER BY due_date ASC',
      [userId, status]
    );
  }
};

module.exports = Assignment;

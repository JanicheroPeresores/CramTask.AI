const { getDatabase } = require('./db');

const GoogleClassroomAssignment = {
  saveMultiple: async (userId, assignments) => {
    const sql = await getDatabase();
    
    try {
      const savedAssignments = [];
      
      for (const assignment of assignments) {
        const rows = await sql(
          `INSERT INTO google_classroom_assignments 
           (user_id, google_classroom_id, course_id, course_name, title, description, 
            due_date, due_time, state, alternate_link, last_synced)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
           ON CONFLICT (user_id, google_classroom_id) DO UPDATE SET 
           title = $5, description = $6, due_date = $7, due_time = $8, 
           state = $9, alternate_link = $10, last_synced = CURRENT_TIMESTAMP, 
           updated_at = CURRENT_TIMESTAMP
           RETURNING *`,
          [
            userId,
            assignment.googleClassroomId,
            assignment.courseId,
            assignment.courseName,
            assignment.title,
            assignment.description,
            assignment.dueDate,
            assignment.dueTime,
            assignment.state,
            assignment.alternateLink,
          ]
        );
        savedAssignments.push(rows[0]);
      }
      
      return savedAssignments;
    } catch (err) {
      console.error('Error saving Google Classroom assignments:', err);
      throw err;
    }
  },

  getByUserId: async (userId) => {
    const sql = await getDatabase();
    try {
      const rows = await sql(
        `SELECT * FROM google_classroom_assignments 
         WHERE user_id = $1 
         ORDER BY due_date ASC, course_name ASC`,
        [userId]
      );
      return rows;
    } catch (err) {
      console.error('Error fetching Google Classroom assignments:', err);
      throw err;
    }
  },

  getById: async (assignmentId) => {
    const sql = await getDatabase();
    try {
      const rows = await sql(
        'SELECT * FROM google_classroom_assignments WHERE id = $1',
        [assignmentId]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (err) {
      console.error('Error fetching Google Classroom assignment:', err);
      throw err;
    }
  },

  delete: async (assignmentId) => {
    const sql = await getDatabase();
    try {
      await sql('DELETE FROM google_classroom_assignments WHERE id = $1', [assignmentId]);
    } catch (err) {
      console.error('Error deleting Google Classroom assignment:', err);
      throw err;
    }
  },

  deleteByUserId: async (userId) => {
    const sql = await getDatabase();
    try {
      await sql('DELETE FROM google_classroom_assignments WHERE user_id = $1', [userId]);
    } catch (err) {
      console.error('Error deleting Google Classroom assignments for user:', err);
      throw err;
    }
  },
};

module.exports = GoogleClassroomAssignment;

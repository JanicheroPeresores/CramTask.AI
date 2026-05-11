const { getDatabase } = require('./db');

const GoogleClassroomCredentials = {
  save: async (userId, accessToken, refreshToken, tokenExpiry) => {
    const sql = await getDatabase();
    
    try {
      const rows = await sql(
        `INSERT INTO google_classroom_credentials (user_id, access_token, refresh_token, token_expiry) 
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO UPDATE SET 
         access_token = $2, refresh_token = $3, token_expiry = $4, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [userId, accessToken, refreshToken, tokenExpiry]
      );
      return rows[0];
    } catch (err) {
      console.error('Error saving Google Classroom credentials:', err);
      throw err;
    }
  },

  getByUserId: async (userId) => {
    const sql = await getDatabase();
    try {
      const rows = await sql(
        'SELECT * FROM google_classroom_credentials WHERE user_id = $1',
        [userId]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (err) {
      console.error('Error fetching Google Classroom credentials:', err);
      throw err;
    }
  },

  delete: async (userId) => {
    const sql = await getDatabase();
    try {
      await sql('DELETE FROM google_classroom_credentials WHERE user_id = $1', [userId]);
    } catch (err) {
      console.error('Error deleting Google Classroom credentials:', err);
      throw err;
    }
  },
};

module.exports = GoogleClassroomCredentials;

const { getDatabase } = require('./db');
const bcrypt = require('bcryptjs');

const User = {
  create: async (username, email, password) => {
    const sql = await getDatabase();
    const hashedPassword = bcrypt.hashSync(password, 10);
    const rows = await sql(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id',
      [username, email, hashedPassword]
    );
    const id = rows[0].id;
    return { id, username, email };
  },

  findByUsername: async (username) => {
    const sql = await getDatabase();
    const rows = await sql('SELECT * FROM users WHERE username = $1', [username]);
    return rows.length > 0 ? rows[0] : null;
  },

  findByEmail: async (email) => {
    const sql = await getDatabase();
    const rows = await sql('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    return rows.length > 0 ? rows[0] : null;
  },

  findByUsernameOrEmail: async (identifier) => {
    const sql = await getDatabase();
    const rows = await sql(
      'SELECT * FROM users WHERE username = $1 OR LOWER(email) = LOWER($2)',
      [identifier, identifier]
    );
    return rows.length > 0 ? rows[0] : null;
  },

  findById: async (id) => {
    const sql = await getDatabase();
    const rows = await sql('SELECT * FROM users WHERE id = $1', [id]);
    return rows.length > 0 ? rows[0] : null;
  },

  updatePassword: async (email, newPassword) => {
    const sql = await getDatabase();
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await sql('UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE email = $2', [hashedPassword, email]);
  },

  setResetToken: async (email, token, expires) => {
    const sql = await getDatabase();
    await sql('UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3', [token, expires, email]);
  },

  findByResetToken: async (token) => {
    const sql = await getDatabase();
    const rows = await sql(
      'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );
    return rows.length > 0 ? rows[0] : null;
  }
};

module.exports = User;

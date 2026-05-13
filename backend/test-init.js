require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { initDatabase } = require('./models/db');

console.log('Initializing database...');

initDatabase()
  .then(() => {
    console.log('Database initialized successfully');
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
  });
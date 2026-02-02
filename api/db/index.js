const { Pool } = require('pg');
const { logger } = require('../middleware/logger');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || process.env.API_DB_HOST,
  port: process.env.DB_PORT || process.env.API_DB_PORT,
  user: process.env.DB_USER || process.env.API_DB_USER,
  password: process.env.DB_PASS || process.env.API_DB_PASS,
  database: process.env.DB_NAME || process.env.API_DB_NAME
});

pool.on('error', (err) => {
  logger.error('Unexpected database error - pool error', { 
    error: err.message, 
    stack: err.stack,
    dbHost: process.env.DB_HOST || process.env.API_DB_HOST,
    dbPort: process.env.DB_PORT || process.env.API_DB_PORT,
    dbName: process.env.DB_NAME || process.env.API_DB_NAME
  });
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};

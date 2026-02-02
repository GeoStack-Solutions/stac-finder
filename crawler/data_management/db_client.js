/**
 * @file db_client.js
 * @description Initializes and exports a a PostgreSQL connection pool.
 */

import pkg from "pg"
const { Pool } = pkg

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

//Load env. variables
const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../../.env') })

//Initialize PostgreSQL connection pool with database configuration
const pool = new Pool({
  host: process.env.DB_HOST || process.env.CRAWLER_DB_HOST,
  port: process.env.DB_PORT || process.env.CRAWLER_DB_PORT,
  user: process.env.DB_USER || process.env.CRAWLER_DB_USER,
  password: process.env.DB_PASS || process.env.CRAWLER_DB_PASS,
  database: process.env.DB_NAME || process.env.CRAWLER_DB_NAME
});

// Handle unexpected database errors
pool.on('error', (err) => {
  console.error('Unexpected DB error:', err);
  process.exit(-1);
});

export const query = (text, params) => pool.query(text, params);
export { pool };

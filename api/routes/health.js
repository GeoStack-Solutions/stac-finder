const express = require('express');
const router = express.Router();
const { logger } = require('../middleware/logger');

const db = require('../db'); // liegt unter /api/db/index.js

router.get('/', async (req, res) => {
  const timestamp = new Date().toISOString();

  const target = {
    host: process.env.DB_HOST || process.env.API_DB_HOST,
    port: process.env.DB_PORT || process.env.API_DB_PORT,
    database: process.env.DB_NAME || process.env.API_DB_NAME
  };

  try {
    // leichter, schneller DB-Check
    await db.query('SELECT 1');

    return res.status(200).json({
      status: 'ok',
      api: 'up',
      database: 'up',
      target,
      timestamp
    });
  } catch (err) {
    logger.error('Health check failed', { error: err.message, stack: err.stack, target });

    return res.status(503).json({
      status: 'degraded',
      api: 'up',
      database: 'down',
      target,
      timestamp
    });
  }
});

module.exports = router;

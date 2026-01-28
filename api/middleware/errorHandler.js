const { logger } = require('./logger');

/**
 * Central error handler for all API errors
 * Logs errors with stacktrace and sends appropriate HTTP response
 */
const errorHandler = (err, req, res, next) => {
  // Collect error context
  const errorContext = {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl || req.url,
    method: req.method,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString()
  };

  // Add query parameters if present
  if (Object.keys(req.query).length > 0) {
    errorContext.query = req.query;
  }

  // Add request body if present (without sensitive data)
  if (req.body && Object.keys(req.body).length > 0) {
    errorContext.body = req.body;
  }

  // Determine HTTP status code
  const statusCode = err.statusCode || err.status || 500;

  // Log error with full context
  if (statusCode >= 500) {
    logger.error('Server Error', errorContext);
  } else if (statusCode >= 400) {
    logger.warn('Client Error', errorContext);
  } else {
    logger.info('Error handled', errorContext);
  }

  // Send response to client
  res.status(statusCode).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: statusCode,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        context: errorContext
      })
    }
  });
};

/**
 * Handler for 404 Not Found
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

module.exports = {
  errorHandler,
  notFoundHandler
};

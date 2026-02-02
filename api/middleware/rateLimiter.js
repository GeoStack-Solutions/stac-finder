const rateLimit = require('express-rate-limit');
const { logger } = require('./logger');

// Key generator to use forwarded IP or fallback to socket IP
const keyGenerator = (req) => {
  return req.ip || req.connection.remoteAddress || 'unknown';
};

// Rate Limiter Configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per IP
  keyGenerator: keyGenerator,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  
  // Handler for blocked requests
  handler: (req, res) => {
    logger.warn({
      message: 'Rate limit exceeded',
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('user-agent')
    });

    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  },

  // Skip function for specific routes (e.g., Health Check)
  skip: (req) => {
    return req.path === '/health';
  }
});

module.exports = limiter;

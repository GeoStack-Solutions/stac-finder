const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const favicon = require('serve-favicon');
const app = express();
const landingPageRouter = require('./routes/landingPage');
const conformanceRouter = require('./routes/conformance');
const openapiRouter = require('./routes/openapi');
const collectionsRouter = require('./routes/collections');
const healthRouter = require('./routes/health');
const { morganMiddleware, requestLogger } = require('./middleware/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');

// Trust proxy - needed for rate limiting behind Docker/nginx
app.set('trust proxy', 1);

// Rate Limiting Middleware
app.use(rateLimiter);

// Favicon
const faviconPath = path.join(__dirname, 'public', 'assets', 'images', 'STACFinder_favicon.png');
if (fs.existsSync(faviconPath)) {
  app.use(favicon(faviconPath));
}

// Logging Middleware
app.use(morganMiddleware);
app.use(requestLogger);

// activate cors
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Routes
app.use('/', landingPageRouter);
app.use('/conformance', conformanceRouter);
app.use('/openapi.json', openapiRouter);
app.use('/collections', collectionsRouter);
app.use('/health', healthRouter);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
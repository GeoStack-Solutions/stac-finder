const express = require('express');
const path = require('path');
const cors = require('cors');  
const app = express();
const landingPageRouter = require('./routes/landingPage');
const conformanceRouter = require('./routes/conformance');
const openapiRouter = require('./routes/openapi');
const collectionsRouter = require('./routes/collections');
const healthRouter = require('./routes/health');
const { morganMiddleware, requestLogger } = require('./middleware/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

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
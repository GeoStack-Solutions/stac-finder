# API Logging and Error Handling

## Overview

The STAC Finder API implements comprehensive logging and error handling to facilitate debugging, monitoring, and operational insights. All HTTP requests and errors are automatically logged with detailed context information.

## Implementation

The logging system uses two industry-standard libraries:

- **Winston**: Structured logging with multiple transports and log rotation
- **Morgan**: HTTP request logging middleware

## Log Files

Logs are stored in the `api/logs/` directory with daily rotation:

### Combined Logs
**File:** `logs/combined-YYYY-MM-DD.log`

Contains all log entries (info, warn, error levels) including:
- HTTP request logs
- Application info messages
- Client errors (4xx)
- Server errors (5xx)

### Error Logs
**File:** `logs/error-YYYY-MM-DD.log`

Contains only error-level logs (5xx server errors) with full stacktraces.

### Log Rotation

- **Rotation**: Daily (based on date)
- **Max File Size**: 20 MB
- **Retention Period**: 14 days
- **Format**: JSON (one log entry per line)

## Log Formats

### HTTP Request Logs

Every API request generates two log entries:

#### 1. Morgan Short Format
Concise one-line summary:

```json
{
  "level": "info",
  "message": "GET /collections 200 953 - 42.753 ms",
  "service": "stac-finder-api",
  "timestamp": "2026-01-06 16:04:27"
}
```

#### 2. Detailed Request Log
Structured log with full request context:

```json
{
  "duration": "43ms",
  "ip": "127.0.0.1",
  "level": "info",
  "message": "HTTP Request",
  "method": "GET",
  "service": "stac-finder-api",
  "status": 200,
  "timestamp": "2026-01-06 16:04:27",
  "url": "/collections?limit=2",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36..."
}
```

**Fields:**
- `method`: HTTP method (GET, POST, PUT, DELETE, etc.)
- `url`: Full request URL including query parameters
- `status`: HTTP response status code
- `duration`: Request processing time in milliseconds
- `ip`: Client IP address
- `userAgent`: Client user agent string
- `timestamp`: ISO 8601 timestamp

### Error Logs

Errors are logged with full context and stacktrace:

#### Client Errors (4xx)
Logged at `warn` level:

```json
{
  "ip": "127.0.0.1",
  "level": "warn",
  "message": "Client Error Route not found: GET /invalid",
  "method": "GET",
  "service": "stac-finder-api",
  "stack": "Error: Route not found: GET /invalid\n    at notFoundHandler (/app/api/middleware/errorHandler.js:58:17)\n    at Layer.handle...",
  "timestamp": "2026-01-06 16:04:44",
  "url": "/invalid",
  "userAgent": "Mozilla/5.0..."
}
```

#### Server Errors (5xx)
Logged at `error` level with full stacktrace:

```json
{
  "level": "error",
  "message": "Server Error Database connection failed",
  "method": "GET",
  "url": "/collections",
  "status": 500,
  "stack": "Error: Database connection failed\n    at query (/app/api/db/index.js:15:11)\n    at async...",
  "ip": "127.0.0.1",
  "userAgent": "curl/7.68.0",
  "query": {
    "limit": "10",
    "sortby": "title"
  },
  "body": {},
  "timestamp": "2026-01-06T16:10:23.456Z"
}
```

**Additional Error Context:**
- `stack`: Full error stacktrace
- `query`: Request query parameters (if present)
- `body`: Request body (if present, excluding sensitive data)

## Log Levels

The API uses the following log levels:

| Level   | Usage                                    | Example                           |
|---------|------------------------------------------|-----------------------------------|
| `info`  | Successful requests (2xx, 3xx)          | GET /collections 200              |
| `warn`  | Client errors (4xx)                     | GET /invalid 404                  |
| `error` | Server errors (5xx)                     | Database connection failed        |

**Default Level**: `info` (configurable via `LOG_LEVEL` environment variable)

## Viewing Logs

### Docker Console Logs

View real-time logs from the running container:

```bash
# Follow logs in real-time
docker-compose logs -f api

# View last 50 lines
docker-compose logs api --tail 50

# View logs since specific time
docker-compose logs api --since 10m
```

### Log Files

#### In Docker Container

```bash
# View combined logs
docker exec stac-api cat /app/api/logs/combined-2026-01-06.log

# View error logs
docker exec stac-api cat /app/api/logs/error-2026-01-06.log

# Tail logs in real-time
docker exec stac-api tail -f /app/api/logs/combined-2026-01-06.log
```

#### On Host Machine

If volume mount is configured correctly, logs are accessible at:

```
/api/logs/combined-2026-01-06.log
/api/logs/error-2026-01-06.log
```

### Parsing JSON Logs

Since logs are in JSON format, you can parse them with tools like `jq`:

```bash
# Pretty-print logs
docker exec stac-api cat /app/api/logs/combined-2026-01-06.log | jq '.'

# Filter by level
docker exec stac-api cat /app/api/logs/combined-2026-01-06.log | jq 'select(.level == "error")'

# Filter by HTTP method
docker exec stac-api cat /app/api/logs/combined-2026-01-06.log | jq 'select(.method == "POST")'

# Extract specific fields
docker exec stac-api cat /app/api/logs/combined-2026-01-06.log | jq '{timestamp, method, url, status}'
```

## Error Handling

### Error Handler Middleware

All errors in the API are processed by a central error handler that:

1. **Captures context**: Method, URL, query parameters, request body, IP, user agent
2. **Logs with stacktrace**: Full error details for debugging
3. **Returns JSON response**: Standardized error format for clients

### Error Response Format

```json
{
  "error": {
    "message": "Route not found: GET /invalid-endpoint",
    "status": 404
  }
}
```

**In Development Mode** (`NODE_ENV=development`), additional debug information is included:

```json
{
  "error": {
    "message": "Route not found: GET /invalid-endpoint",
    "status": 404,
    "stack": "Error: Route not found...",
    "context": {
      "message": "Route not found: GET /invalid-endpoint",
      "stack": "Error: Route not found...",
      "url": "/invalid-endpoint",
      "method": "GET",
      "ip": "127.0.0.1",
      "userAgent": "curl/7.68.0",
      "timestamp": "2026-01-06T16:10:23.456Z"
    }
  }
}
```

### 404 Not Found Handler

The API includes a dedicated 404 handler that catches all unmatched routes and generates appropriate error responses with logging.

## Configuration

### Environment Variables

Configure logging behavior via environment variables:

```bash
# Set log level (default: info)
LOG_LEVEL=debug

# Set Node environment
NODE_ENV=production  # Hides stacktraces in error responses
NODE_ENV=development # Includes stacktraces in error responses
```

### Log Level Options

- `error`: Only error logs
- `warn`: Warnings and errors
- `info`: Info, warnings, and errors (default)
- `debug`: All logs including debug messages
- `silly`: Most verbose logging

## Middleware Architecture

### Logger Middleware (`api/middleware/logger.js`)

Provides three exports:

1. **`logger`**: Winston logger instance for manual logging
2. **`morganMiddleware`**: HTTP request logging (short format)
3. **`requestLogger`**: Detailed HTTP request logging with context

### Error Handler Middleware (`api/middleware/errorHandler.js`)

Provides two exports:

1. **`errorHandler`**: Central error processing with logging
2. **`notFoundHandler`**: 404 error handler for unmatched routes

### Integration in Express App

Middleware is registered in `api/app.js`:

```javascript
// Logging middleware (registered first)
app.use(morganMiddleware);
app.use(requestLogger);

// ... routes ...

// Error handling middleware (registered last)
app.use(notFoundHandler);
app.use(errorHandler);
```

**Order is critical**: Logging middleware must be registered before routes, and error handlers must be registered after routes.

## Best Practices

- Monitor logs regularly for error patterns and performance issues
- JSON format enables easy parsing with tools like `jq` or log aggregation services (ELK, Grafana Loki)
- Log rotation is pre-configured (20MB max, 14 days retention)
- Request bodies exclude sensitive data automatically

## Troubleshooting

**No logs appearing:**
- Check container logs: `docker-compose logs api`
- Verify log directory: `docker exec stac-api ls -la /app/api/logs/`

**Error context missing:**
- Set `NODE_ENV=development` for full stacktraces in responses
- Server errors (5xx) are logged to `error-YYYY-MM-DD.log`

## Related Documentation

- [Health Endpoint](health.md) - API monitoring
- [Collections Endpoint](collections.md) - Main API endpoints
- [API README](../../api/README.md) - General documentation

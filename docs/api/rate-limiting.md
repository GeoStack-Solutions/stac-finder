# Rate Limiting

The API implements rate limiting to protect against abuse and overload.

## Configuration

- **Window**: 15 minutes
- **Max Requests**: 100 requests per IP per window
- **Response Code**: HTTP 429 (Too Many Requests)
- **Headers**: 
  - `RateLimit-Limit`: Maximum requests allowed
  - `RateLimit-Remaining`: Requests remaining in current window
  - `RateLimit-Reset`: Unix timestamp when the limit resets

## Implementation

Rate limiting is implemented using `express-rate-limit` middleware in [api/middleware/rateLimiter.js](../../api/middleware/rateLimiter.js).

The middleware:
- Tracks requests per IP address
- Returns HTTP 429 when limit is exceeded
- Logs blocked requests for monitoring
- Skips health check endpoint (`/health`)

## Response Format

When rate limit is exceeded:

```json
{
  "error": "Too many requests from this IP, please try again later.",
  "retryAfter": "15 minutes"
}
```

## Logging

All blocked requests are logged with:
- IP address
- Request path
- HTTP method
- User agent

Check [api/logs/combined-*.log](../../api/logs) for rate limit warnings.

## Configuration Options

To adjust rate limiting, edit [api/middleware/rateLimiter.js](../../api/middleware/rateLimiter.js):

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Time window (15 minutes)
  max: 100,                 // Max requests per window
  // ...
});
```

## Testing

**Note**: Testing rate limiting locally with Docker can be challenging because all requests appear to come from the same internal Docker network IP. Rate limiting works correctly in production when deployed behind a reverse proxy (nginx, Caddy, etc.) that properly forwards client IPs.

For local testing:
1. Run the API directly (not in Docker): `cd api && npm run dev`
2. Use the test script: `node api/tests/test-rate-limit.js`

## Production Deployment

When deploying behind a reverse proxy, ensure:

1. **Proxy forwards real client IP** (nginx example):
```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Real-IP $remote_addr;
```

2. **Express trusts proxy** (already configured in app.js):
```javascript
app.set('trust proxy', 1);
```

This ensures the rate limiter sees real client IPs, not the proxy IP.

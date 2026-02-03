# Load Testing with autocannon

This directory contains load testing scripts to evaluate the performance and scalability of the STAC Finder API.

## Prerequisites

1. **Install autocannon**:
   ```bash
   npm install autocannon --save-dev
   ```

2. **Ensure API is running**:
   ```bash
   npm start
   # or
   docker-compose up api
   ```

3. **Database must be accessible** with data loaded

## Running Load Tests

### Quick Start

```bash
# From the api/ directory
npm run load-test
```

### Manual Execution

```bash
node load-tests/run-load-tests.js
```

### Custom Configuration

```bash
# Test against different URL
API_URL=http://localhost:3000 node load-tests/run-load-tests.js
```

## Test Scenarios

The load test runs the following scenarios:

1. **Baseline** - Simple collection listing (`GET /collections`)
2. **Pagination** - Larger page size (`limit=50`)
3. **Free Text Search** - Search for "sentinel"
4. **BBox Filter** - Spatial filtering
5. **Datetime Filter** - Temporal filtering
6. **Combined Filters** - Multiple filters (q + bbox + datetime)
7. **CQL2 Filter** - Complex JSON filter
8. **Sorting** - Sort by title
9. **Combined Query** - All parameters together

## Test Configuration

- **Duration**: 30 seconds per scenario
- **Concurrent Connections**: 10
- **Requests per Connection**: 1 (pipelining)
- **Bailout**: 1000 errors (test stops if exceeded)

## Understanding Results

### Key Metrics

| Metric | Description | Good Value |
|--------|-------------|------------|
| **Requests/sec** | Throughput (requests per second) | >50 req/s |
| **Latency (avg)** | Average response time | <300ms |
| **p99** | 99th percentile latency | <1000ms |
| **Errors** | Failed requests (4xx/5xx) | 0 |
| **Timeouts** | Connection timeouts | 0 |

### Latency Percentiles

- **p50** (median): 50% of requests are faster than this
- **p75**: 75% of requests are faster than this
- **p90**: 90% of requests are faster than this
- **p99**: 99% of requests are faster than this
- **p999**: 99.9% of requests are faster than this

### Example Output

```
┌─────────────────────────────────────────────┬──────────┬───────────┬──────────┬─────────┐
│ Scenario                                    │ Req/sec  │ Latency   │ Errors   │ p99     │
│                                             │          │ (avg ms)  │          │ (ms)    │
├─────────────────────────────────────────────┼──────────┼───────────┼──────────┼─────────┤
│ Baseline - GET /collections                 │    120.5 │     82.45 │        0 │  156.32 │
│ Free Text Search - GET /collections?q=...   │     45.2 │    221.35 │        0 │  432.18 │
│ Combined Query - All parameters             │     12.8 │    781.23 │        2 │ 1250.45 │
└─────────────────────────────────────────────┴──────────┴───────────┴──────────┴─────────┘
```

## Interpreting Results

### Performance Targets

- **Excellent**: Avg latency <100ms, p99 <300ms
- **Good**: Avg latency <300ms, p99 <1000ms
- **Acceptable**: Avg latency <500ms, p99 <2000ms
- **Poor**: Avg latency >500ms or errors >1%

### Common Bottlenecks

1. **High latency on complex queries**
   - Problem: Complex CQL2 or combined filters are slow
   - Solution: Add database indexes, optimize query planning

2. **Low throughput on baseline**
   - Problem: Even simple queries are slow
   - Solution: Check database connection pool, optimize basic queries

3. **Errors under load**
   - Problem: Connection timeouts, 500 errors
   - Solution: Increase database connection pool, add error handling

4. **High p99 latency**
   - Problem: Outliers with very slow responses
   - Solution: Identify slow queries in logs, add query timeouts

## Results Storage

Results are automatically saved to:
```
api/load-tests/results/load-test-YYYY-MM-DDTHH-mm-ss.json
```

Each file contains:
- Timestamp of test execution
- Configuration (duration, connections, base URL)
- Detailed results for each scenario
- Request statistics, latency percentiles, errors

## Advanced Usage

### Single Scenario Test

```bash
# Edit run-load-tests.js and comment out unwanted scenarios
# Or use autocannon directly:
npx autocannon -d 30 -c 10 http://localhost:4000/collections
```

### Longer Duration Test

```bash
# Edit DURATION constant in run-load-tests.js
# or use autocannon directly:
npx autocannon -d 60 -c 20 http://localhost:4000/collections
```

### Stress Testing (Higher Load)

```bash
# Edit CONNECTIONS constant to 50 or 100
# WARNING: May overwhelm database
npx autocannon -d 30 -c 50 http://localhost:4000/collections
```

## Recommended Workflow

1. **Baseline Test** - Run with default settings to establish baseline
2. **Analyze Results** - Identify slowest endpoints
3. **Optimize** - Add indexes, caching, or optimize queries
4. **Re-test** - Run again to verify improvements
5. **Document** - Save results and add to performance.md

## Integration with CI/CD

Add to package.json scripts:
```json
{
  "scripts": {
    "load-test": "node load-tests/run-load-tests.js",
    "load-test:quick": "API_URL=http://localhost:4000 node load-tests/run-load-tests.js"
  }
}
```

## Troubleshooting

### API Not Reachable
```
 Cannot reach API at http://localhost:4000
```
**Solution**: Start the API with `npm start` or `docker-compose up api`

### Connection Refused
```
Error: connect ECONNREFUSED 127.0.0.1:4000
```
**Solution**: Check if port 4000 is available and API is running

### High Error Rate
```
  Most Errors: Combined Query - All parameters
Total Errors: 150
```
**Solution**: Check API logs, database connection pool, reduce load

### Database Connection Errors
```
Error: Connection pool exhausted
```
**Solution**: Increase `max` in db connection pool configuration

## Next Steps

After running load tests:

1. **Document Results** - Add findings to `docs/api/performance.md`
2. **Identify Bottlenecks** - Note which endpoints are slowest
3. **Optimize** - Implement improvements (indexes, caching, etc.)
4. **Monitor** - Set up monitoring for production (Prometheus, Grafana)
5. **Set Alerts** - Configure alerts for latency thresholds

## Related Documentation

- [Performance Documentation](../docs/api/performance.md)
- [Database Optimization](../docs/database/optimization.md)
- [API Collections Endpoint](../docs/api/collections.md)

# Load Testing - Quick Start Guide

## 1. Setup

```bash
# Make sure the API is running
cd /Users/luis/repository/stac-finder
docker-compose up api

# In a new terminal
cd api
npm install  # If not already done
```

## 2. Run Load Test

```bash
npm run load-test
```

This takes approximately **5-6 minutes** (9 scenarios × 30 seconds + 5 seconds pause between tests).

## 3. What is Being Tested?

1. **Baseline** - Simple collection query
2. **Pagination** - Large page size (50 items)
3. **Free Text Search** - Search for "sentinel"
4. **BBox Filter** - Spatial filtering
5. **Datetime Filter** - Temporal filtering
6. **Combined Filters** - Multiple filters combined
7. **CQL2 Filter** - Complex JSON filters
8. **Sorting** - Sort by title
9. **Combined Query** - All parameters together

## 4. Understanding Results

### During the Test

You will see a progress indicator:
```
Running 30s test @ http://localhost:4000/collections
10 connections

┌─────────┬──────┬──────┬───────┬──────┬─────────┬─────────┬───────┐
│ Stat    │ 2.5% │ 50%  │ 97.5% │ 99%  │ Avg     │ Stdev   │ Max   │
├─────────┼──────┼──────┼───────┼──────┼─────────┼─────────┼───────┤
│ Latency │ 45ms │ 82ms │ 156ms │ 180ms│ 85.23ms │ 32.41ms │ 250ms │
└─────────┴──────┴──────┴───────┴──────┴─────────┴─────────┴───────┘
```

### After the Test

A summary of all scenarios:
```
┌─────────────────────────────────────────────┬──────────┬───────────┬──────────┬─────────┐
│ Scenario                                    │ Req/sec  │ Latency   │ Errors   │ p99     │
├─────────────────────────────────────────────┼──────────┼───────────┼──────────┼─────────┤
│ Baseline - GET /collections                 │    120.5 │     82.45 │        0 │  156.32 │
│ Free Text Search                            │     45.2 │    221.35 │        0 │  432.18 │
└─────────────────────────────────────────────┴──────────┴───────────┴──────────┴─────────┘
```

## 5. Evaluation

### Good 
- Latency < 300ms
- p99 < 1000ms
- No errors
- Requests/sec > 50

### Needs Improvement 
- Latency > 500ms → Database optimization needed
- Errors > 0 → API or DB problems
- p99 > 2000ms → Individual queries too slow

## 6. Saving Results

Results are automatically saved to:
```
api/load-tests/results/load-test-2026-02-03T12-30-45.json
```

## 7. For Documentation

Copy the most important results to `docs/api/performance.md`:
- Throughput (Requests/sec)
- Latency (Average and p99)
- Identified bottlenecks
- Recommendations

## Common Issues

### API Not Reachable
```
 Cannot reach API at http://localhost:4000
```
**Solution**: `docker-compose up api` or `npm start`

### Too Many Errors
```
  Most Errors: Combined Query
Total Errors: 150
```
**Solution**: 
- Check DB connection pool settings
- Check logs: `docker-compose logs api`
- Possibly reduce connections (CONNECTIONS=5 in run-load-tests.js)

### Very Slow
```
Average Latency: 1250.45ms
```
**Solution**:
- Check database indexes
- Optimize queries
- Implement caching

## Next Steps

1. **Establish Baseline** - First test = baseline value
2. **Identify Bottlenecks** - Which endpoints are slow?
3. **Optimize** - Indexes, caching, query optimization
4. **Re-test** - Measure improvements
5. **Document** - Results in performance.md

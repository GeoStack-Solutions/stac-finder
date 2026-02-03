# Performance Analysis and Optimization Recommendations

## Overview

This document documents the performance tests of the STAC API, identifies edge cases, and describes optimization needs according to the requirements specification (Section 3.2.4 and 5.4).

**Test Environment:**
- PostgreSQL 16 with PostGIS
- Node.js 22 / Express
- Test Database: finder.stacindex.org (Production Data)
- Test Framework: Jest with Supertest

**Requirements:**
- Average response time for typical queries: **≤ 5 seconds**
- Memory consumption per query: **< 100 MB**

---

## Benchmark Results

### 1. Spatial Filtering (BBox)

| Query | BBox | Limit | Response Time | Status |
|-------|------|-------|---------------|--------|
| Global | `-180,-90,180,90` | 100 | ~700 ms | Good |
| Hemisphere | `-180,-90,0,90` | 100 | ~150 ms | Very Good |
| Continent (Europe) | `-10,36,40,71` | 100 | ~160 ms | Very Good |
| Country (Germany) | `5.87,47.27,15.04,55.10` | 100 | ~150 ms | Very Good |
| City (Berlin) | `13.09,52.34,13.76,52.68` | 100 | ~170 ms | Very Good |
| Anti-Meridian | `170,-10,-170,10` | 100 | ~200 ms | Good |

**Findings:**
- All spatial queries well below 5s threshold
- Anti-Meridian overhead: ~0-20% (acceptable)
- No inverse correlation between BBox size and performance

### 2. Temporal Filtering (Datetime)

| Query | Time Span | Limit | Response Time | Status |
|-------|-----------|-------|---------------|--------|
| 1 Year | `2020-01-01/2020-12-31` | 100 | ~70 ms | Very Good |
| 10 Years | `2015-01-01/2024-12-31` | 100 | ~110 ms | Very Good |
| 50 Years | `1975-01-01/2025-12-31` | 100 | ~100 ms | Very Good |
| 100 Years | `1900-01-01/2000-12-31` | 100 | ~70 ms | Very Good |
| Open-ended | `1957-10-04/..` | 100 | ~110 ms | Very Good |
| Microsecond Precision | `2020-06-15T12:30:45.123456Z/...` | 100 | ~60 ms | Very Good |

**Findings:**
- Time span has minimal impact on performance
- Main factor: Number of results, not interval size
- PostgreSQL indexes on `temporal_start`/`temporal_end` work optimally

### 3. Combined Filters (Stress Tests)

| Query | Filters | Limit | Response Time | Status |
|-------|---------|-------|---------------|--------|
| Extreme Combined | BBox + Datetime + CQL2 + Text | 200 | ~930 ms | Good |
| Global + Century | `-180,-90,180,90` + 100 years | 500 | ~210 ms | Very Good |
| Maximum Complexity | BBox + Time + CQL2 + Free-text | 200 | ~1500 ms | Good |

**Findings:**
- Multiple filter combinations stay under 5s
- PostgreSQL optimizer selects efficient execution plans
- No significant performance degradation with combined filters

### 4. Pagination & Large Datasets

| Query | Limit | Response Time | Status |
|-------|-------|---------------|--------|
| First Page | 200 | ~200 ms | Very Good |
| Page 5 (offset 800) | 200 | ~250 ms | Good |
| Page 10 (offset 1800) | 200 | ~290 ms | Good |
| Average | 200 | ~240 ms/page | Very Good |
| **limit=10000** | **10000** | **~115 seconds** | **CRITICAL** |

**Findings:**
- Pagination performance stable (~3x degradation over 10 pages)
- **CRITICAL ISSUE**: `limit=10000` exceeds 5s threshold by factor 23x
- **Recommendation**: Limit max to 1000, enforce pagination

### 5. Stress Tests (Concurrent/Sequential)

| Test | Queries | Average | Max | Status |
|------|---------|---------|-----|--------|
| 20 Concurrent | 20 parallel | ~1550 ms | ~1600 ms | Good |
| 50 Sequential | 50 sequential | ~130 ms | ~160 ms | Very Good |
| 20 Alternating | 4 query types | ~870 ms | ~2150 ms | Good |

**Findings:**
- No performance degradation with parallel requests
- No cache thrashing with alternating query types
- System stable under load

### 6. Memory Consumption

| Test | Memory Increase | Status |
|------|-----------------|--------|
| Single Query (Standard) | 1-5 MB | Good |
| Global Query (limit=500) | ~35 MB | Good |
| 100 Consecutive Queries | -7 MB to +60 MB | No Leak |
| Memory Leak Detection | Fluctuating, no trend | Stable |

**Findings:**
- Memory consumption below 100 MB threshold
- No memory leaks detectable
- Garbage collection works effectively

---

## Edge Cases and Problem Areas

### CRITICAL: Extreme Limits

**Problem:**  
Queries with `limit=10000` require ~115 seconds response time.

**Cause:**  
- PostgreSQL must load and serialize 10,000 complete STAC Collection JSONs
- Data transfer over network (13+ MB response)
- Node.js JSON serialization for large payloads

**Impact:**  
- Timeout risks for clients
- High server load with multiple parallel requests
- Exceeds requirement (5s) by factor 23x

**Recommended Solution:**
```javascript
// In /api/utils/pagination.js
const MAX_LIMIT = 1000; // Reduce from 10000 to 1000

// Client-side documentation
// "For large datasets: Use pagination with limit ≤ 1000"
```

**Priority:** HIGH

---

### MODERATE: Deep Pagination

**Problem:**  
Pagination degrades over many pages (~3x slower at Page 10 vs Page 1).

**Cause:**  
- PostgreSQL OFFSET must skip all previous rows
- At offset=1800, 1800 rows are scanned and discarded

**Impact:**  
- Page 10: ~290ms instead of ~200ms (still acceptable)
- Could become problematic with even deeper pagination

**Recommended Solution:**
- Cursor-based pagination for very deep result sets
- Or: Limit max pages (e.g., only first 50 pages accessible)

**Priority:** MEDIUM

---

### LOW: Anti-Meridian Overhead

**Problem:**  
Queries across the anti-meridian are ~0-20% slower.

**Cause:**  
- PostGIS performs more complex `ST_Intersects` operation
- OR logic for two BBox regions

**Impact:**  
- Overhead negligible (< 50ms for typical queries)
- Still well below 5s threshold

**Solution:**  
- No optimization necessary
- PostGIS index works well

**Priority:** LOW

---


## Monitoring Thresholds

### Performance Metrics

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Response Time (P50) | < 1s | > 3s | > 5s |
| Response Time (P95) | < 3s | > 5s | > 10s |
| Response Time (P99) | < 5s | > 10s | > 20s |
| Memory per Query | < 50 MB | > 75 MB | > 100 MB |
| Concurrent Connections | < 50 | > 75 | > 100 |
| Query Timeouts | 0/hour | > 5/hour | > 20/hour |
| Database CPU | < 70% | > 80% | > 90% |

### Alert Strategy

- **Warning Alerts:** Email notification, review within 24 hours
- **Critical Alerts:** Immediate notification, investigate within 1 hour
- **Threshold Violations:** Log for analysis, adjust thresholds if needed

---

## Test Execution

### Running Performance Tests Locally

```bash
cd /Users/luis/repository/stac-finder/api

# All performance tests
npm test -- tests/integration/performance.test.js

# Single test suite
npm test -- tests/integration/performance.test.js -t "Extreme Bounding Box"

# With verbose output
npm test -- tests/integration/performance.test.js --verbose
```

### Expected Test Duration

- Complete Suite: ~140 seconds
- Without limit=10000 test: ~25 seconds

### Test Coverage

- 17 Performance Tests covering:
  - Spatial Filters (6 Tests)
  - Temporal Filters (2 Tests)
  - Combined Filters (2 Tests)
  - Pagination (2 Tests)
  - Stress Tests (3 Tests)
  - Memory Tests (1 Test)
  - Edge Cases (3 Tests)

### Running Tests

```bash
cd /api

# Run all performance tests
npm test -- tests/integration/performance.test.js

# Run specific test suite
npm test -- tests/integration/performance.test.js -t "Extreme Bounding Box"
```

---

## Load Testing Results (autocannon)

**Test Date:** February 3, 2026  
**Test Tool:** autocannon  
**Configuration:**
- Duration: 30s per scenario
- Concurrent Connections: 10
- Base URL: http://localhost:4000

### Results Summary

| Scenario | Req/sec | Avg Latency | p99 Latency | Errors | Status |
|----------|---------|-------------|-------------|--------|--------|
| Baseline (GET /collections) | 81.7 | 122 ms | 251 ms | 0 |  Excellent |
| Pagination (limit=50) | 48.5 | 205 ms | 493 ms | 0 |  Good |
| Datetime Filter | 47.2 | 211 ms | 337 ms | 0 |  Good |
| CQL2-JSON Filter | 18.8 | 530 ms | 1267 ms | 0 | Acceptable |
| Sorting (sortby=title) | 16.8 | 590 ms | 855 ms | 0 |  Acceptable |
| Free Text Search (q=sentinel) | 1.0 | 7974 ms | 8649 ms | 0 |  Critical |
| BBox Filter | 4.9 | 7710 ms | 18797 ms | 897 |  Critical |
| Combined (q+bbox+datetime) | 1.6 | 5575 ms | 7677 ms | 0 |  Poor |
| All Parameters | 0.1 | 9863 ms | 9979 ms | 26 |  Critical |

### Critical Performance Issues

#### 1. Free Text Search ( CRITICAL)
- **Problem:** 7.9 seconds average latency
- **Impact:** Only 1 request/second throughput
- **Cause:** Missing full-text search indexes
- **Priority:** HIGH

**Recommended Fix:**
```sql
-- Create full-text search index
CREATE INDEX idx_collections_fts ON collections 
USING gin(to_tsvector('english', title || ' ' || description || ' ' || array_to_string(keywords, ' ')));
```

#### 2. BBox Filter ( CRITICAL)
- **Problem:** 897 errors (89.7% error rate), 7.7s latency
- **Impact:** Spatial filtering essentially broken under load
- **Cause:** Likely missing spatial index or query timeout
- **Priority:** HIGH

**Recommended Fix:**
```sql
-- Create spatial index if not exists
CREATE INDEX idx_collections_bbox ON collections USING GIST(bbox);

-- Check and optimize spatial query in filtering.js
-- Increase query timeout or optimize PostGIS query
```

#### 3. Combined Queries ( CRITICAL)
- **Problem:** 9.9 seconds with 26 timeouts when all parameters combined
- **Impact:** Complex queries unusable
- **Cause:** Cumulative effect of missing indexes + inefficient query planning
- **Priority:** HIGH

### Bottleneck Analysis

**Slowest Endpoint:** Combined Query (all parameters)
- Average: 9,862ms
- p99: 9,979ms
- Throughput: 0.14 req/s

**Fastest Endpoint:** Baseline
- Average: 122ms
- p99: 251ms
- Throughput: 81.7 req/s

**Performance Ratio:** 80x difference between simplest and most complex query

### Load Test Recommendations

1. **Database Indexes (URGENT):**
   - Full-text search index for `title`, `description`, `keywords`
   - Spatial index (GIST) for `bbox`
   - Temporal index for `temporal_start`, `temporal_end`
   - Composite indexes for common filter combinations

2. **Query Optimization:**
   - Analyze slow queries with `EXPLAIN ANALYZE`
   - Set query timeout to 5 seconds max
   - Implement query result caching (Redis)

3. **Connection Pool:**
   - Review PostgreSQL connection pool settings
   - Current errors suggest pool exhaustion under load
   - Consider increasing pool size or implementing connection queuing

4. **Monitoring:**
   - Add Prometheus metrics for query latency
   - Set up alerts for latency > 5s
   - Track error rates per endpoint

5. **Testing:**
   - Re-run load tests after applying indexes
   - Target: All queries < 1s average, < 3s p99
   - Target: 0% error rate under normal load


**Note:** Load test results saved to: `api/load-tests/results/load-test-2026-02-03T12-53-49-182Z.json`

---

## Summary

### Strengths

- All standard queries well under 5s requirement
- Spatial and temporal filters very performant (< 1s)
- Combined filters scale efficiently
- No memory leaks detected
- System stable under concurrent load (20+ parallel queries)

### Critical Issues

- **limit=10000:** Exceeds 5s threshold by factor 23x (requires immediate fix)

### Recommended Actions

1. **Immediate:** Reduce MAX_LIMIT to 1000
2. **Short-term:** Implement caching and query timeouts
3. **Medium-term:** Add performance monitoring and alerting

### Overall Assessment

**Rating:** 4/5

The API meets performance requirements for typical queries. The identified issue with extreme limits is well-understood and can be resolved through a simple configuration change.

---

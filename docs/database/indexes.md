# Database Indexes for Performance Optimization

This document describes all recommended indexes for the STAC-Finder database to improve query performance and loading times.

## Index Overview

### stac.sources - Indexes

#### 1. **Unique Index on `url`** (Uniqueness + Performance)
```sql
CREATE UNIQUE INDEX idx_sources_url ON stac.sources(url);
```
- **Rationale:** The URL is the unique identifier and is frequently queried during loading and filtering
- **Query Impact:** `upsertSource()`, `getSourceIdByUrl()`, `loadSources()`, `isInSources()`

#### 2. **Index on `last_crawled_timestamp`** (Time-based Filtering)
```sql
CREATE INDEX idx_sources_last_crawled_timestamp ON stac.sources(last_crawled_timestamp);
```
- **Rationale:** Used when filtering sources by crawl age (`loadSourcesForCrawling()`)
- **Query Impact:** Sorting and filtering by crawl timestamp

#### 3. **Index on `type`** (Type-based Filtering)
```sql
CREATE INDEX idx_sources_type ON stac.sources(type);
```
- **Rationale:** Sources can be filtered by type (Catalog, Collection, API)
- **Query Impact:** Future filtering by source type

#### 4. **Composite Index `(type, last_crawled_timestamp)`** (Combined Queries)
```sql
CREATE INDEX idx_sources_type_crawled ON stac.sources(type, last_crawled_timestamp);
```
- **Rationale:** Common combined query: "Which sources of type X have not been crawled in N days?"
- **Query Impact:** Optimized combined filtering

### stac.collections - Indexes

#### 1. **Index on `source_id`** (Foreign Key Lookups)
```sql
CREATE INDEX idx_collections_source_id ON stac.collections(source_id);
```
- **Rationale:** Foreign key to sources is frequently used in joins
- **Query Impact:** JOINs between collections and sources

#### 2. **Index on `title`** (Text Search)
```sql
CREATE INDEX idx_collections_title ON stac.collections(title);
```
- **Rationale:** Title is used in search operations and filters
- **Query Impact:** `loadSourcesForCrawling()`, API search functions

#### 3. **Index on `last_crawled_timestamp`** (Crawl History)
```sql
CREATE INDEX idx_collections_last_crawled_timestamp ON stac.collections(last_crawled_timestamp);
```
- **Rationale:** Tracking when collections were last updated
- **Query Impact:** Chronological queries, data freshness

#### 4. **GIST Index on `spatial_extent`** (Spatial Queries)
```sql
CREATE INDEX idx_collections_spatial_extent ON stac.collections USING GIST(spatial_extent);
```
- **Rationale:** PostGIS GIST index for efficient spatial operations (bounding box search)
- **Query Impact:** Geographic filters (bbox queries)

#### 5. **Composite Index `(source_id, last_crawled_timestamp)`** (Joined Queries)
```sql
CREATE INDEX idx_collections_source_crawled ON stac.collections(source_id, last_crawled_timestamp);
```
- **Rationale:** Common combined query: "Collections of a source, sorted by crawl time"
- **Query Impact:** Optimized source-specific queries

#### 6. **Index on `temporal_start` and `temporal_end`** (Datetime Filtering)
```sql
CREATE INDEX idx_collections_temporal_start ON stac.collections(temporal_start);
CREATE INDEX idx_collections_temporal_end ON stac.collections(temporal_end);
```
- **Rationale:** API datetime queries filter by temporal extents (BEFORE, AFTER, DURING)
- **Query Impact:** `?datetime=...` filter in `/collections` endpoint

#### 7. **GIN Index for Array Searches** (Keywords, Platforms, etc.)
```sql
CREATE INDEX idx_collections_keywords_gin ON stac.collections USING GIN(keywords);
CREATE INDEX idx_collections_platform_gin ON stac.collections USING GIN(platform_summary);
CREATE INDEX idx_collections_constellation_gin ON stac.collections USING GIN(constellation_summary);
```
- **Rationale:** Faster array searches for filtering (CQL2 queries with "IN" operators)
- **Query Impact:** CQL2 array containment checks, faceted search

#### 8. **Text Search Index** (Full-Text Search Optimization)
```sql
CREATE INDEX idx_collections_description_gin ON stac.collections USING GIN(to_tsvector('english', description));
CREATE INDEX idx_collections_title_gin ON stac.collections USING GIN(to_tsvector('english', title));
```
- **Rationale:** API uses ILIKE on title/description (free-text search `?q=...`)
- **Query Impact:** `parseTextSearch()` queries, significantly faster than ILIKE

#### 9. **Unique Index on `id`** (Collections ID)
```sql
CREATE UNIQUE INDEX idx_collections_id ON stac.collections(id);
```
- **Rationale:** Upsert conflict detection (`ON CONFLICT (id)`) and unique identification
- **Query Impact:** `upsertCollection()`, individual collection lookups

## Installing All Indexes

To create all indexes at once, execute the following SQL commands:

```sql
-- Sources indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_sources_url ON stac.sources(url);
CREATE INDEX IF NOT EXISTS idx_sources_last_crawled_timestamp ON stac.sources(last_crawled_timestamp);
CREATE INDEX IF NOT EXISTS idx_sources_type ON stac.sources(type);
CREATE INDEX IF NOT EXISTS idx_sources_type_crawled ON stac.sources(type, last_crawled_timestamp);

-- Collections indexes (Basic)
CREATE UNIQUE INDEX IF NOT EXISTS idx_collections_id ON stac.collections(id);
CREATE INDEX IF NOT EXISTS idx_collections_source_id ON stac.collections(source_id);
CREATE INDEX IF NOT EXISTS idx_collections_title ON stac.collections(title);
CREATE INDEX IF NOT EXISTS idx_collections_last_crawled_timestamp ON stac.collections(last_crawled_timestamp);

-- Collections indexes (Spatial/Temporal)
CREATE INDEX IF NOT EXISTS idx_collections_spatial_extent ON stac.collections USING GIST(spatial_extent);
CREATE INDEX IF NOT EXISTS idx_collections_temporal_start ON stac.collections(temporal_start);
CREATE INDEX IF NOT EXISTS idx_collections_temporal_end ON stac.collections(temporal_end);

-- Collections indexes (Text/Array Search)
CREATE INDEX IF NOT EXISTS idx_collections_keywords_gin ON stac.collections USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_collections_platform_gin ON stac.collections USING GIN(platform_summary);
CREATE INDEX IF NOT EXISTS idx_collections_constellation_gin ON stac.collections USING GIN(constellation_summary);
CREATE INDEX IF NOT EXISTS idx_collections_description_gin ON stac.collections USING GIN(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_collections_title_gin ON stac.collections USING GIN(to_tsvector('english', title));

-- Collections indexes (Composite)
CREATE INDEX IF NOT EXISTS idx_collections_source_crawled ON stac.collections(source_id, last_crawled_timestamp);

-- Analyze tables after index creation
ANALYZE stac.sources;
ANALYZE stac.collections;
```

## Performance Improvements

### Expected Improvements:

| Query | Before | After | Index |
|-------|--------|-------|-------|
| `loadSourcesForCrawling(7)` | O(n) Full Table Scan | O(log n) Index Seek | `idx_sources_last_crawled_timestamp` |
| `getSourceIdByUrl(url)` | O(n) Full Table Scan | O(1) Unique Index | `idx_sources_url` |
| `loadSources()` with Type Filter | O(n) | O(log n) | `idx_sources_type` |
| Collections Join by source_id | O(n) | O(log n) | `idx_collections_source_id` |
| Spatial Bounding Box Queries | O(n) | O(log n) | GIST Index |
| **Datetime Filter (temporal_start/end)** | O(n) | O(log n) | `idx_collections_temporal_*` |
| **Text Search (ILIKE)** | O(n) Full Scan | O(log n) | GIN Full-Text Index |
| **Array Containment (keywords IN)** | O(n) | O(log n) | GIN Array Index |
| **Upsert by Collection ID** | O(n) | O(1) | `idx_collections_id` |

### Storage Impact:

- **Total Index Size:** ~150-300 MB (depending on data volume)
- **Write Overhead:** +10-15% on INSERT/UPDATE (trade-off for faster reads)
- **B-Tree Indexes:** 4 Sources + 5 Collections = ~50-100 MB
- **GIST Index (spatial_extent):** ~20-40 MB
- **GIN Indexes (Arrays + Full-Text):** ~80-160 MB (depending on text length)

## Maintenance

### Check Indexes:

```sql
-- All indexes on stac.sources table
SELECT * FROM pg_indexes WHERE tablename = 'sources' AND schemaname = 'stac';

-- All indexes on stac.collections table
SELECT * FROM pg_indexes WHERE tablename = 'collections' AND schemaname = 'stac';
```

### Optimize Indexes (after large data loads):

```sql
REINDEX TABLE stac.sources;
REINDEX TABLE stac.collections;
```

### Find Unused Indexes:

```sql
SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;
```

## Future Indexes (Optional)

As the database grows, the following additional indexes may be useful:

```sql
-- Full-Text Search on Description
CREATE INDEX idx_collections_description_tsvector ON stac.collections 
  USING GIN(to_tsvector('english', description));

-- Partial Index for active sources
CREATE INDEX idx_sources_active ON stac.sources(last_crawled_timestamp) 
  WHERE last_crawled_timestamp IS NOT NULL;
```

## Notes

- These indexes are optimized for **PostgreSQL 12+**
- The order of columns in composite indexes is important (do not change)
- After creating indexes, run `ANALYZE stac.sources; ANALYZE stac.collections;`
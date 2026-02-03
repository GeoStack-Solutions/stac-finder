# Changelog

All notable changes to this project will be documented in this file.

## [v1.0.0](https://github.com/GeoStack-Solutions/stac-finder/releases/tag/v1.0.0) - 2026-02-03

### Initial Release

First stable release of STACFinder - A central platform for searching and exploring STAC (SpatioTemporal Asset Catalogs) collections.

#### API Features

**Core Endpoints**
- Landing page endpoint (`GET /`)
- Conformance endpoint (`GET /conformance`) - STAC API conformance classes
- Collections endpoint (`GET /collections`) - List all STAC collections and supports sorting, filtering and pagination
- Collection detail endpoint (`GET /collections/{id}`) - Retrieve metadata from individual collections
- Queryables endpoint (`GET /collections/queryables`) - List queryable fields
- Sortables endpoint (`GET /collections/sortables`) - List sortable fields
- OpenAPI specification endpoint (`GET /openapi.json`)
- Health check endpoint (`GET /health`)

**Query Capabilities**
- CQL2 (Common Query Language) support for advanced filtering
- Pagination support with configurable limits
- Sorting by collection properties
- Field filtering for optimized responses

**Database & Storage**
- PostgreSQL/PostGIS integration for spatial metadata storage
- Optimized spatial queries
- Database connection pooling

**Security & Validation**
- SQL injection protection through parameterized queries
- Input validation for all endpoints
- Error handling middleware
- Rate limiting middleware to protect API against abuse (100 requests per IP per 15 minutes)

**Logging & Monitoring**
- Request/response logging with Morgan
- Health monitoring endpoint
- Error tracking and logging

**Developer Experience**
- OpenAPI 3.0 specification
- Comprehensive API documentation
- Docker support for easy deployment
- Environment-based configuration

#### Crawler Features

**Core Crawling**
- Starts the crawl process and processes sources by type (API/Static)
- Recursive crawling of STAC Catalogs/Collections
- Polite delay between requests

**Queue Management**
- Persistent URL queue in the database
- Duplicate detection and cleanup
- Backup/Restore of queue on interruption

**STAC API Support**
- Direct crawl via `/collections`
- Retry strategy with backoff
- Error handling for invalid/unreachable endpoints

**Database Integration**
- Storing sources and collections
- Upserts to avoid duplicates
- Time-based selection of sources (e.g., "older than N days")

**Logging & Monitoring**
- Structured logs (start, progress, errors)
- Summary of found collections

**Developer Experience**
- Docker support
- Environment-based configuration

#### Web-UI Features

...

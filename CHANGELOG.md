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
- Startet den Crawl‑Prozess und verarbeitet Quellen nach Typ (API/Static)
- Rekursives Crawling von STAC Catalogs/Collections
- Polite Delay zwischen Requests

**Queue Management**
- Persistente URL‑Queue in der Datenbank
- Duplikat‑Erkennung und Bereinigung
- Backup/Restore der Queue bei Abbruch

**STAC API Support**
- Direkter Crawl über `/collections`
- Retry‑Strategie mit Backoff
- Fehlerbehandlung für ungültige/unerreichbare Endpoints

**Database Integration**
- Speichern von Quellen und Collections
- Upserts zur Vermeidung von Duplikaten
- Zeitbasierte Auswahl von Quellen (z. B. „älter als N Tage“)

**Logging & Monitoring**
- Strukturierte Logs (Start, Fortschritt, Fehler)
- Zusammenfassung gefundener Collections

**Developer Experience**
- Docker‑Support
- Environment‑basierte Konfiguration

#### Web-UI Features

**STACFinder Search Interface**
- Dedicated `/stacfinder` route for cross-catalog collection search
- `StacFinderSearch.vue` - Main search view with filter panel, results grid and pagination
- `CollectionFilterPanel.vue` - Comprehensive filter form with search, datetime, bbox and metadata filters
- `CollectionMetadataFilter.vue` - Dynamic CQL2 filter builder driven by queryables from API

**Search & Filtering**
- Free-text search across collection titles, descriptions, keywords
- Temporal filtering with date picker (supports open-ended ranges)
- Spatial filtering with interactive map and bbox selection
- Spatial relation options: intersects, contains, within, overlaps
- Advanced metadata filtering with CQL2 expressions
- Dynamic queryables loaded from API with type-specific operators

**Results & Navigation**
- Collection results displayed as cards with metadata preview
- Pagination with next/prev navigation
- Sorting by title, description, temporal extent (ascending/descending)
- Click-through to full collection details in standard STAC Browser view
- Navigation buttons for Home and STACFinder search

**State Management**
- Vuex store (`stacFinderState`) preserves filters, sorting and results
- Search state persists when navigating to collection details and back
- No page reload required when returning to search results

**API Integration**
- `CollectionApiAdapter.js` - API client for query building and requests
- `collectionCql.js` - CQL2-Text query builder for filter expressions
- Dynamic fetching and caching of queryables and sortables from API
- Robust error handling with user-friendly error messages

**Configuration & Deployment**
- Environment variable support via dotenv (`SB_stacFinderApiUrl`)
- Docker configuration with dynamic API URL injection
- Responsive layout for header, footer and search components

**Developer Experience**
- Comprehensive documentation (`docs/stacfinder.md`)
- Modular Vue component architecture for easy maintenance
- Git submodule integration with main STACFinder repository
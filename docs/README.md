# STAC Finder Documentation

## Overview

STACFinder is a central platform for searching and exploring STAC (SpatioTemporal Asset Catalogs) collections from multiple sources. It consists of three main components:

### Architecture

```
┌─────────────┐      HTTP        ┌──────────────┐     SQL (read)    ┌──────────────┐
│   Web-UI    │ ◄──────────────► │   STAC API   │ ◄────────────────►│  PostgreSQL  │
│ STAC Browser│                  │   (Node.js)  │                   │   + PostGIS  │
└─────────────┘                  └──────────────┘                   └──────────────┘
                                                                            ▲
                                                                            │
                                                                            │ SQL (write)
                                                                            │
                                                                     ┌──────────────┐
                                                                     │   Crawler    │
                                                                     │(Data Collect)│
                                                                     └──────────────┘
```

**Components:**

1. **API** - RESTful STAC API providing collection search with filtering, sorting, pagination and CQL2 support
2. **Crawler** - Automated service collecting STAC collection metadata from various sources
3. **Web-UI** - Frontend interface based on STAC Browser with cross-catalog search capabilities
4. **Database** - PostgreSQL/PostGIS storing indexed collection metadata

This documentation covers the technical details of each component, API endpoints, query capabilities, and operational aspects.

---

## API Documentation

### API Endpoints
- [Collections](api/collections.md)
- [Queryables](api/queryables.md)
- [Sortables](api/sortables.md)
- [Health](api/health.md)

#### Query Parameters
- [Sorting](api/query-param/sorting.md)
- [Pagination](api/query-param/pagination.md)
- [Datetime](api/query-param/datetime.md)
- [Bounding Box](api/query-param/bbox.md)
- [Free-text search](api/query-param/free-text-search.md)
- [CQL2 Text](api/query-param/cql2-text.md)
- [CQL2 JSON](api/query-param/cql2-json.md)

### Development & Operations
- [Logging and Error Handling](api/logging.md)
- [Validation](api/validation.md)
- [Rate Limiting](api/rate-limiting.md)

## Crawler Documentation
- [Crawler Documentation](crawler/crawler-documentation.md)
- [Data Management](crawler/crawler-data-management.md)
- [Logging](crawler/crawler-logging.md)

## Web-UI Documentation

- [STACFinder Collections Documentation](../web-ui/docs/stacfinder.md)
- [STAC Browser README](../web-ui/README.md)

## Database Documentation
- [Access](database/database-access.md)
- [Schema](database/schema.md)
- [Indexes](database/indexes.md)


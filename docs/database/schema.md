# Database Schema

This document describes the database structure for STACFinder, including table definitions and user permissions.

## Schema Organization

All tables are organized under the `stac` schema in PostgreSQL.

## Tables

### stac.sources

The `sources` table stores information about STAC catalog sources that are crawled by the system.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | integer | PRIMARY KEY, auto-increment | Unique identifier for the source |
| `title` | text | | Human-readable title of the source |
| `url` | text | UNIQUE | URL of the STAC catalog or API |
| `type` | varchar(100) | | Type of source (e.g., 'API', 'Static') |
| `last_crawled_timestamp` | timestamptz | DEFAULT now() | Timestamp of the last successful crawl |

**Indexes:**
- Primary key on `id`
- Unique constraint on `url`

### stac.collections

The `collections` table stores STAC collection metadata that has been crawled from various sources.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | text | PRIMARY KEY | Unique identifier for the collection |
| `title` | text | | Collection title |
| `description` | text | | Collection description |
| `keywords` | text[] | | Array of keywords |
| `spatial_extent` | geometry(Polygon,4326) | | Spatial bounding box as PostGIS geometry |
| `temporal_start` | timestamptz | | Start of temporal extent |
| `temporal_end` | timestamptz | | End of temporal extent (null for ongoing collections) |
| `license` | text | | License identifier |
| `doi` | text | | Digital Object Identifier |
| `platform_summary` | text[] | | Array of platform names |
| `constellation_summary` | text[] | | Array of constellation names |
| `gsd_summary` | jsonb | | Ground sample distance summary |
| `processing_level_summary` | text[] | | Array of processing levels |
| `instrument_summary` | text[] | | Array of instrument names |
| `source_id` | integer | FOREIGN KEY → sources(id) | Reference to the source catalog |
| `last_crawled_timestamp` | timestamptz | DEFAULT now() | Timestamp of the last crawl |
| `raw_json` | jsonb | | Complete STAC collection JSON |
| `providers` | jsonb | | Provider information |
| `stac_extensions` | text[] | | Array of STAC extension identifiers |

**Relationships:**
- `source_id` references `stac.sources(id)` with ON DELETE SET NULL

### stac.catalogs

The `catalogs` table stores catalog metadata and configuration for registered STAC catalogs.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | integer | PRIMARY KEY, auto-increment | Unique identifier |
| `url` | text | UNIQUE, NOT NULL | Catalog URL |
| `slug` | varchar(50) | UNIQUE, NOT NULL | URL-friendly identifier |
| `title` | varchar(50) | NOT NULL | Catalog title |
| `summary` | text | NOT NULL | Catalog description |
| `email` | varchar(255) | | Contact email |
| `access` | varchar(10) | NOT NULL | Access type (e.g., 'public', 'restricted') |
| `access_info` | text | | Additional access information |
| `is_api` | boolean | NOT NULL | Whether catalog is an API or static |
| `created` | timestamptz | NOT NULL | Creation timestamp |
| `updated` | timestamptz | NOT NULL | Last update timestamp |

### stac.urlQueue

The `urlQueue` table is used by the crawler for queue management during the crawling process.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | integer | PRIMARY KEY, auto-increment | Unique identifier |
| `url_of_source` | text | UNIQUE, NOT NULL | URL to be crawled |
| `title_of_source` | text | | Title of the source |
| `parent_url` | text | | URL of the parent resource |

**Purpose:** Maintains a queue of URLs to crawl and prevents duplicate crawling through the unique constraint on `url_of_source`.

## Database Users and Permissions

STACFinder uses two database users with different permission levels:

### crawler User

The `crawler` user is used by the crawling service and has full privileges:

- **GRANT ALL** on `stac.sources`
- **GRANT ALL** on `stac.collections`
- **GRANT ALL** on `stac.catalogs`
- **GRANT ALL** on `stac.urlQueue`

This user can:
- Insert new sources and collections
- Update existing records
- Delete records
- Execute all CRUD operations

### stacapi User

The `stacapi` user is used by the API service and has read-only access:

- **GRANT SELECT** on `stac.sources`
- **GRANT SELECT** on `stac.collections`

This user can:
- Query sources and collections
- No write, update, or delete permissions

This separation ensures the API cannot accidentally modify data and follows the principle of least privilege.

## Sequences

- `stac.collections_id_seq` - Auto-increment sequence for collections
- `stac.sources_id_seq` - Auto-increment sequence for sources

## PostGIS Extension

The database requires the PostGIS extension for spatial geometry support:
- The `spatial_extent` column uses PostGIS `geometry(Polygon,4326)` type
- This enables efficient spatial queries and indexing

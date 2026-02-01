# PostgreSQL + PostGIS Setup Documentation (Server `finder.stacindex.org`)

This guide explains how the web server for the database was set up. It is accessible via SSH on port 22. A Debian Linux system without a graphical user interface is running there.

## Connecting to the Server

Log in to the server via SSH.

```bash
ssh stac-finder@finder.stacindex.org
```

## Package Installation

- Installs PostgreSQL including additional modules (contrib).
- Installs PostGIS for geospatial functionality.

```bash
sudo apt install postgresql postgresql-contrib
sudo apt install postgis
```

## Create Database and Enable PostGIS

- Creates the `stacfinder` database.
- Enables the PostGIS extension in this database.

```bash
sudo -u postgres createdb stacfinder
sudo -u postgres psql -d stacfinder -c "CREATE EXTENSION postgis;"
```

## Verify Installation

- Updates package lists.
- Ensures PostgreSQL and PostGIS are installed.
- \dx displays active extensions (PostGIS should appear).

```bash
sudo apt update
sudo apt install postgresql postgis
sudo -u postgres psql -d stacfinder -c "\dx"
```

## Create Schema and Tables

- Creates the `stac` schema.
- Creates the `sources` and `collections` tables with geometry columns and references.

```sql
CREATE SCHEMA stac;

CREATE TABLE IF NOT EXISTS stac.sources (
    id serial PRIMARY KEY,
    title text,
    url text,
    type varchar(100),
    last_crawled_timestamp timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stac.collections (
    id serial PRIMARY KEY,
    title text,
    description text,
    keywords text[],
    spatial_extent geometry(Polygon, 4326),
    temporal_start timestamptz,
    temporal_end timestamptz,
    providers text[],
    license text,
    doi text[],
    platform_summary text[],
    constellation_summary text[],
    gsd_summary text[],
    processing_level_summary text[],
    source_id integer REFERENCES stac.sources(id) ON DELETE SET NULL,
    last_crawled_timestamp timestamptz DEFAULT now()
);

-- Create indexes for performance optimization
-- See docs/database/indexes.md for detailed documentation

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

## User and Permission Management

### API User (Read-Only Access)

- User `stacapi` can connect.
- Has only read permissions (`SELECT`) on the tables.

```sql
CREATE USER stacapi WITH PASSWORD '-';

GRANT CONNECT ON DATABASE stacfinder TO stacapi;
GRANT USAGE ON SCHEMA stac TO stacapi;
GRANT SELECT ON stac.collections TO stacapi;
GRANT SELECT ON stac.sources TO stacapi;
```

### Crawler User (Write Access)

- User `crawler` can connect.
- Has read and write permissions (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) on the tables.

```sql
CREATE USER crawler WITH PASSWORD '-';

GRANT CONNECT ON DATABASE stacfinder TO crawler;
GRANT USAGE ON SCHEMA stac TO crawler;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA stac TO crawler;
```

# Access from Windows PowerShell

Direct access to the database via SSH and `psql`.

```bash
ssh stac-finder@finder.stacindex.org
sudo -u postgres psql -d stacfinder
```

# Configure External Connection

## Check Paths

- Shows the paths to `postgresql.conf` and `pg_hba.conf`.

```bash
sudo -u postgres psql -c "SHOW config_file;"
sudo -u postgres psql -c "SHOW hba_file;"
```

## Configure PostgreSQL to Listen on All Interfaces

- Enables external connections (`listen_addresses = '*'`).

```bash
sudo sed -i "s/^#listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/15/main/postgresql.conf
```

## Authentication for External Clients

- Allows external connections for `stacapi` and `crawler`.
- Authentication via secure method `scram-sha-256`.

```bash
echo "host    stacfinder    stacapi    0.0.0.0/0    scram-sha-256" | sudo tee -a /etc/postgresql/15/main/pg_hba.conf
echo "host    stacfinder    crawler    0.0.0.0/0    scram-sha-256" | sudo tee -a /etc/postgresql/15/main/pg_hba.conf
```

## Restart Service

- Reloads the configuration.
- PostgreSQL is now accessible from external sources.

```bash
sudo systemctl restart postgresql
```

# Database Access Guide

This guide explains how to access and manage the PostgreSQL database with PostGIS extension used by STAC Finder.

## Overview

The project uses **PostgreSQL 16** with **PostGIS 3.4** for storing and querying spatial data. The database runs in a Docker container and can be accessed via:
- **pgAdmin** (Web Interface) - Recommended for visual database management

---

## pgAdmin Web Interface

### Access pgAdmin

1. **Start Docker containers:**
   ```bash
   docker-compose up
   ```

2. **Open pgAdmin in your browser:**
   ```
   http://localhost:5050
   ```

3. **Login credentials:**
   - **Email:** `admin@admin.com`
   - **Password:** `admin`

### Add PostgreSQL Server (First Time Only)

After logging into pgAdmin:

1. **Right-click on "Servers"** in the left sidebar
2. Select **Register → Server...**

3. **General Tab:**
   - **Name:** `STAC Finder` (or any name you prefer)

4. **Connection Tab:**
   - **Host name/address:** `db`
   - **Port:** `5432`
   - **Maintenance database:** `stacfinder`
   - **Username:** `stacuser`
   - **Password:** `stacpass`
   - **Save password:** Check this box

5. Click **Save**

### What You'll See

After connecting, you can explore:

```
Servers
 └─ STAC Finder
     └─ Databases (1)
         └─ stacfinder
             ├─ Schemas
             │   ├─ public (default schema)
             │   └─ stac (for STAC-specific tables)
             └─ Extensions
                 ├─ postgis (spatial data support)
                 └─ postgis_topology
```

### Using pgAdmin

- **Create tables:** Right-click on schema → Create → Table
- **Run SQL queries:** Tools → Query Tool
- **View data:** Right-click on table → View/Edit Data
- **Import/Export:** Right-click on table → Import/Export Data

---

## Database Schema

### Available Schemas

- **`public`**: Default PostgreSQL schema
- **`stac`**: Custom schema for STAC-related data (recommended for all project tables)

### PostGIS Extensions

The following PostGIS extensions are pre-installed:
- **`postgis`**: Core spatial data types and functions
- **`postgis_topology`**: Topology support for complex spatial relationships

---

## Data Persistence

### How Data is Stored

Data is stored in a **Docker volume** named `postgres_data`. This means:

✅ **Data persists** when you stop/restart containers with `docker-compose down` and `docker-compose up`
✅ **Data survives** container rebuilds
❌ **Data is deleted** only when you run `docker-compose down -v` (removes volumes)

### Backup and Restore

#### Create Backup

```bash
# Full database backup
docker exec stacfinder-db pg_dump -U stacuser -d stacfinder > backup.sql

# Schema only (no data)
docker exec stacfinder-db pg_dump -U stacuser -d stacfinder --schema-only > schema.sql

# Data only (no schema)
docker exec stacfinder-db pg_dump -U stacuser -d stacfinder --data-only --inserts > data.sql
```

#### Restore Backup

```bash
# Restore from backup
docker exec -i stacfinder-db psql -U stacuser -d stacfinder < backup.sql
```

---

## Troubleshooting

### Cannot Connect to Database

**Issue:** "Connection refused" or "Server not found"

**Solutions:**
1. Wait 10-20 seconds after `docker-compose up` for database to initialize
2. Check if container is running: `docker ps | grep stacfinder-db`
3. Check logs: `docker-compose logs db`
4. Ensure you're using correct host:
   - Inside Docker (API): `db`
   - From host machine: `localhost`

### Port Already in Use

**Issue:** "Port 5433 already in use"

**Solution:**
Change the external port in `docker-compose.yml`:
```yaml
ports:
  - "5434:5432"  # Use a different port
```

### pgAdmin Won't Start

**Issue:** Email validation error

**Solution:**
Ensure `PGADMIN_DEFAULT_EMAIL` uses a valid email format (e.g., `admin@admin.com`)

### Lost pgAdmin Configuration

**Issue:** Server disappeared after restart

**Solution:**
This only happens if you ran `docker-compose down -v`. Re-add the server manually (see Option 1).

---

## Security Notes

**Development Only:** The credentials in `docker-compose.yml` are for development purposes only.

For production environments:
- Use strong passwords
- Store credentials in `.env` file (not in git)
- Use environment-specific configuration
- Enable SSL connections
- Restrict database access by IP

---

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [pgAdmin Documentation](https://www.pgadmin.org/docs/)
- [Docker PostgreSQL Image](https://hub.docker.com/_/postgres)

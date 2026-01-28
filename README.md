# STACFinder

A STAC-compliant API for browsing and searching SpatioTemporal Asset Catalogs stored in PostgreSQL/PostGIS.

## Features

- **STAC API Collections Endpoint**: Browse all STAC collections
- **PostgreSQL/PostGIS**: Spatial database for STAC metadata
- **Docker Setup**: Easy deployment with Docker Compose
- **Security**: SQL injection protection through input validation

## Installation & Start

### Prerequisites

1. Clone or download the repository.
2. Make sure [Docker](https://www.docker.com/) is installed.
3. **Configure environment variables:**
   
   The project requires two separate `.env` files with database credentials. Copy the example files and add your passwords:
   
   **API Service** (read-only access):
   ```bash
   cp api/.env.example api/.env
   # Edit api/.env and set DB_PASS
   ```
   
   **Crawler Service** (read/write access):
   ```bash
   cp crawler/.env.example crawler/.env
   # Edit crawler/.env and set DB_PASS
   ```

### Docker

Start the application in the project directory:
  - **First start (build container):**
    ```bash
    docker-compose up --build
    ```
  - **Subsequent starts:**
    ```bash
    docker-compose up -d
    ```
4. Stop the application:
  ```bash
  docker-compose down
  ```

**Additional notes:**
- The application is accessible at: [http://localhost:4000](http://localhost:4000)
- pgAdmin (Database Management) is accessible at: [http://localhost:5050](http://localhost:5050)
  - See [Database Access Guide](docs/database/database-access.md) for setup instructions
- Development mode with hot-reload is enabled by default in Docker

**Services included:**
- **API Server** - Port 4000
- **PostgreSQL + PostGIS** - Port 5432 on finder.stacindex.org webserver
- **pgAdmin** - Port 5050 (web interface for database management)

## API Usage

The STAC API is accessible at `http://localhost:4000` and provides endpoints for browsing collections and searching geospatial data.

**Main Endpoints:**
- `GET /collections` - List all STAC collections with filtering, sorting and pagination
- `GET /collections/{id}` - Get detailed information about a specific collection

**Features:**
- STAC 1.0.0 compliant responses
- Pagination with configurable limits
- Sorting by multiple fields
- Input validation and SQL injection protection

**For detailed API documentation, parameters, and examples:**
- [API Documentation](api/README.md) - Complete API reference with all endpoints and parameters
- [Database Documentation](docs/database/) - Database schema and access guides

## Crawler

### Usage
The Crawler runs in node js.

*For Now, we will change it later:* To start the crawling process, start the docker and make sure that you have a working connection to the Database. Then create a temporal js file in the folder crawler\crawling\tests with the following code:

```bash
import { startCrawler } from "../crawler_engine.js";

await startCrawler()
```

TODO: Crawling start, wie er im finalen Prozess sein wird beschreiben

Details about the crawling process will be shown in the terminal.

**For more information:** [Crawler Documentation](/docs/crawler/crawler-documentation.md)
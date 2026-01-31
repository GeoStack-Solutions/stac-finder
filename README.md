# STACFinder

A STAC-compliant API for browsing and searching SpatioTemporal Asset Catalogs stored in PostgreSQL/PostGIS.

## Features

- **STAC API Collections Endpoint**: Browse all STAC collections
- **PostgreSQL/PostGIS**: Spatial database for STAC metadata
- **Docker Setup**: Easy deployment with Docker Compose
- **Security**: SQL injection protection through input validation

## Installation & Start

### Prerequisites

1. **Git** installed
2. Make sure [Docker](https://www.docker.com/) is installed and running
3. **Node.js** installed (only for local development)

### Initial Setup (One-time)

1. Clone the repository
   
2. Initialize submodules:
```bash
# Clone submodule
git submodule update --init --recursive
```

3. Configure environment variables
   Database credentials must be configured in two separate `.env` files. Copy the example files and add your passwords:
   
   **API Service**  (read-only access)
```bash
# Copy example file
cp api/.env.example api/.env

# Then edit api/.env and set password:
# DB_PASS=YourSecurePassword
```
  **Crawler Service** (read/write access)
```bash
# Copy example file
cp crawler/.env.example crawler/.env

# Then edit crawler/.env and set password:
# DB_PASS=YourSecurePassword
```

### 1. Docker Development

**Adjust docker-compose.yml**

The current `docker-compose.yml` is already configured for development (no need to change). For reference, the containers and their key settings for API and Web-UI are listed below: 

```yaml
  # Backend API 
  api:
    container_name: stac-api
    build:
      context: ./api
      dockerfile: Dockerfile
    ports:
      - "4000:4000"
    env_file:
      - ./api/.env
    volumes: # all volumes are required
      - ./api:/app/api 
      - /app/api/node_modules 
      - ./docs:/app/docs
      - ./api/logs:/app/api/logs
    command: npm run dev # npm run dev for development

  # Frontend STAC Browser 
  web-ui:
    container_name: stacfinder-web-ui
    build:
      context: ./web-ui
      dockerfile: Dockerfile
      target: development # target required
      args:
        - DYNAMIC_CONFIG=true
        - historyMode=history
        - pathPrefix=/
    ports:
      - "8080:8080"
    environment:
      - VUE_APP_API_URL=http://api:4000 
    volumes: # volumes required
      - ./web-ui:/app 
      - /app/node_modules
    depends_on:
      - api
```

**Start**

```bash
#First start (build container)
docker-compose up --build

# Subsequent starts
docker-compose up -d

# Stop
docker-compose down
```

Accessible at:
- Frontend (Web-UI): [http://localhost:8080](http://localhost:8080)
- API Backend: [http://localhost:4000](http://localhost:4000)
- pgAdmin (Database Management): [http://localhost:5050](http://localhost:5050)
  - See [Database Access Guide](docs/database/database-access.md) for setup instructions

### 2. Docker Production

**Adjust docker-compose.yml**

The current `docker-compose.yml` is configured for **Development**. For production, you need to make the following changes:

```yaml
  # Backend API
  api:
    container_name: stac-api
    build:
      context: ./api
      dockerfile: Dockerfile
    ports:
      - "4000:4000"
    env_file:
      - ./api/.env
    volumes:
    # PRODUCTION: Remove development volumes
      - ./api/logs:/app/api/logs  # Keep logs only
    command: npm start  # PRODUCTION: npm start as command

  # Frontend STAC Browser
  web-ui:
    container_name: stacfinder-web-ui
    build:
      context: ./web-ui
      dockerfile: Dockerfile
      # PRODUCTION: Remove target
      args:
        - DYNAMIC_CONFIG=true
        - historyMode=history
        - pathPrefix=/
   ports:
      - "8080:8080"
   environment:
      - VUE_APP_API_URL=http://api:4000 
    # PRODUCTION: Remove volumes
    depends_on:
      - api
```

**Start**

```bash
#First start (build container)
docker-compose up --build

# Subsequent starts
docker-compose up -d

# Stop
docker-compose down
```

Accessible at:
- Frontend (Web-UI): [http://localhost:8080](http://localhost:8080)
- API Backend: [http://localhost:4000](http://localhost:4000)
- pgAdmin (Database Management): [http://localhost:5050](http://localhost:5050)
  - See [Database Access Guide](docs/database/database-access.md) for setup instructions
  
### 3. Local Development

No adjustments needed for local development. 

**Start**

- Terminal 1 (Start backend):
```bash
cd api
npm install # only needed first time
npm run dev
# To stop, press Ctrl+C
```

- Terminal 2 (Start frontend):
```bash
cd web-ui
npm install # only needed first time
npm start
# To stop, press Ctrl+C
```

Accessible at:
- Frontend (Web-UI): [http://localhost:8080](http://localhost:8080)
- API Backend: [http://localhost:4000](http://localhost:4000)


**Services included:**
- **API Server** - Port 4000
- **PostgreSQL + PostGIS** - Port 5432 on finder.stacindex.org webserver
- **pgAdmin** - Port 5050 (web interface for database management)

## Working with Git Submodules

A quick guide for managing the web-ui submodule in STACFinder:

A submodule is a Git repository embedded inside another Git repository. In STACFinder, the `web-ui` folder is a submodule pointing to the forked STAC Browser repository.
The main repository only stores a reference (commit hash) to the submodule, not the actual files.

 → Always push or pull the submodule before updating the main repository!

### Initialize submodules
```bash
# Option 1: Clone repository and initialize submodules in one command
git clone --recurse-submodules https://github.com/GeoStack-Solutions/stac-finder.git

# Option 2: If already cloned, then initialize submodules
git submodule update --init --recursive
```

### Pull latest changes
```bash
# Update main repository
git pull

# Update all submodules to their latest commits
git submodule update --remote --recursive

# Or do both in one command
git pull --recurse-submodules
```
**In VS Code:** Submodules appear under Source Control as separate repositories. Click pull for each repository.

### Push changes in a submodule
```bash
# Navigate to submodule
cd web-ui

# Make sure you're on the correct branch
git checkout dev

# Make your changes, then commit
git add .
git commit -m "Your commit message"

# Push to submodule's remote repository
git push origin dev

# Go back to main repository
cd ..

# Update submodule reference in main repository
git add web-ui
git commit -m "Update web-ui submodule"
git push
```
**In VS Code:** The submodule shows separately in Source Control. Commit and push the submodule first, then commit and push the main repository.

## API

The STAC API is accessible at `http://localhost:4000` and provides STAC 1.0.0 compliant endpoints for browsing collections and searching geospatial data.

**Main Endpoints:**
- `GET /` - Landing page
- `GET /collections` - List all collections (with filtering, sorting, pagination)
- `GET /collections/{id}` - Get collection details
- `GET /health` - Health check

**For detailed documentation:**
- [API Documentation](api/README.md)
- [Query Parameters](docs/api/query-param/)

## Web-UI (STAC Browser)

The frontend is a customized [STAC Browser](https://github.com/radiantearth/stac-browser) with integrated STACFinder collection search.

**Standard STAC Browser** allows browsing and searching within a single STAC catalog or API.

**STACFinder Extension** enables **cross-catalog search** across all indexed STAC collections. The STACFinder API aggregates metadata from multiple catalogs, allowing users to discover and filter collections from different providers in one unified interface.

**Key Features:**
- Cross-catalog collection search (powered by STACFinder API)
- Advanced filtering (free-text, temporal, spatial, CQL2 metadata)
- Sorting and pagination
- URL-based state for bookmarking and sharing
- Seamless transition to native STAC catalog browsing

Accessible at [http://localhost:8080](http://localhost:8080)

**For detailed documentation:** [Web-UI Documentation](web-ui/docs/stacfinder.md)

## Crawler
The Crawler collects infromation of all the collections in the STAC Index Database and saves these informations in a database so that you can browse through these collections on our STACFinder Website.

### Usage

The crawler runs on our STACFinder Server. 
To controll the crawler, open your terminal and get a connection to the server by typing:
```bash
ssh stac-finder@finder.stacindex.org
```
Enter the given password for the server.
Then, navigate to the folder "crawler\" and make sure that all dependencies are installed. You will find more information about this in the [Crawler Documentation](/docs/crawler/crawler-documentation.md). 

*Start the crawling process:*
```bash
pm2 start STACFinderCrawler
```
*Stop the crawling process:*
```bash
pm2 stop STACFinderCrawler
```
*Get informations about the crawling process:*
```bash
pm2 logs
```
Details about the crawling process will then be shown in the terminal.

**For more information:** [Crawler Documentation](/docs/crawler/crawler-documentation.md)

# STACFinder

## Features

## Installation & Start

### Docker

1. Clone or download the repository.
2. Make sure [Docker](https://www.docker.com/) is installed.
3. Start the application in the project directory:
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
5. **Database access:** See [Database Access Guide](docs/database-access.md) for details on connecting to PostgreSQL

**Additional notes:**
- The application is accessible at: [http://localhost:4000](http://localhost:4000)
- pgAdmin (Database Management) is accessible at: [http://localhost:5050](http://localhost:5050)
  - Login: `admin@admin.com` / `admin`
  - See [Database Access Guide](docs/database/database-access.md) for setup instructions
- Development mode with hot-reload is enabled by default in Docker

**Services included:**
- **API Server** - Port 4000
- **PostgreSQL + PostGIS** - Port 5433 (external), stores spatial STAC data
- **pgAdmin** - Port 5050 (web interface for database management)

## API Endpoints

### Collections

#### GET `/collections`
Returns all STAC collections from the database.

**Try it:**
- [http://localhost:4000/collections](http://localhost:4000/collections)

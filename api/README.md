# STAC API Component

This folder contains the modular implementation of the STAC-compliant API. It provides RESTful endpoints for accessing STAC (SpatioTemporal  Asset Catalogs) collections, following the [STAC API specification](https://github.com/radiantearth/stac-api-spec).

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run tests
npm test
```

## API Endpoints

The API provides the following STAC-compliant endpoints:

- **`GET /`** - Landing page
- **`GET /conformance`** - Conformance classes
- **`GET /collections`** - List all collections (with filtering, sorting, pagination)
- **`GET /collections/{id}`** - Get collection by ID
- **`GET /collections/queryables`** - List queryable fields for collections
- **`GET /collections/sortables`** - List sortable fields for collections
- **`GET /openapi.json`** - OpenAPI 3.0 specification
- **`GET /health`** - Health check endpoint

For detailed API documentation, see:
- [Collections API](../docs/api/collections.md)
- [Health Endpoint](../docs/api/health.md)
- [Query Parameters](../docs/api/query-param/)
- [Queryables](../docs/api/queryables.md/)
- [Sortables](../docs/api/sortables.md/)
- [Validation](../docs/api/validation.md)
- [Logging](../docs/api/logging.md)
- [Rate Limiting](../docs/api/rate-limiting.md)

## Development Guidelines

- Each route is defined in `routes/` and linked to a controller in `controllers/`
- Use `express.Router()` for modular routing
- Add reusable logic in `utils/` (validation, parsing, query building)
- Use `middleware/` for logging and error handling
- Keep database logic in `db/index.js`
- All utilities should return consistent error objects: `{ status, error, message }`

## Testing

```bash
# Run all tests
npm test
```

Tests are organized in `tests/unit/` and `tests/integration/`. Integration tests require a running PostgreSQL database.
# STAC API Component

This folder contains the modular implementation of the STAC-compliant API. It provides RESTful endpoints for accessing geospatial collections and items, following the [STAC API specification](https://github.com/radiantearth/stac-api-spec).

## Project Structure

```
api/ 
├── controllers/          # Business logic for each route 
├── routes/               # Express routers for each endpoint 
├── middleware/           # Logging, error handling, etc. 
├── db/                   # PostgreSQL connection and query helpers 
├── utils/                # Helper functions (e.g. CQL2 parser) 
├── app.js                # Main Express app entry point 
├── .env                  # Environment variables 
├── package.json          # Dependencies and scripts
```

## Development Guidelines

- Each route is defined in `routes/` and linked to a controller in `controllers/`.
- Use `express.Router()` for modular routing.
- Add reusable logic (e.g. CQL2 parsing) in `utils/`.
- Use `middleware/` for logging and error handling.
- Keep database logic in `db/index.js`.

## Testing

- Unit tests should be written for each controller.
- Integration tests should validate DB interactions.
- Use Postman or curl to manually test endpoints.

## Documentation

- OpenAPI spec will be available at `/docs/api/openapi.json`.
- All endpoints follow the STAC API specification and return STAC-compliant JSON.

## Collaboration

This component is maintained by the STAC API group. It provides data to the Web-UI group and receives input from the Crawler group via the shared PostgreSQL database.

Please follow modular design, write clean code, and document your changes clearly.
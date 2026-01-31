# Queryables Endpoint

## Overview

The `/collections/queryables` endpoint provides a JSON Schema describing all fields that can be used to filter STAC Collections via the Collection Search API.  
It follows the STAC API – Collection Search and Queryables specifications and allows clients (e.g. the Web UI) to discover which properties are filterable and how they are interpreted.

Enum values for several fields are **dynamically derived from the database**, ensuring that the available filter options always reflect the current data.

**Endpoint:**
- `GET /collections/queryables` — Returns the schema of filterable fields

---

## GET /collections/queryables

Returns a Queryables object describing all fields available for filtering collections.  
Enum values for `license`, `platform`, `processingLevel`, `constellation` and `provider` are dynamically derived from the database.

### Request
```http
GET /collections/queryables
```

### Query Parameters

This endpoint does not accept any query parameters.

### Response

Returns a JSON object conforming to the OGC Queryables specification (JSON Schema).  
The response lists all filterable properties, their data types, and—where applicable—dynamic enum values.

### Queryable Properties

| Property | Type | Description | Example Usage | Enum Values |
|----------|------|-------------|---------------|-------------|
| `title` | string | Collection title | `title LIKE '%Sentinel%'` | – |
| `description` | string | Collection description | `description LIKE '%atmosphere%'` | – |
| `license` | string | Data license identifier | `license = 'CC-BY-4.0'` | Dynamic (DB) |
| `doi` | string | Digital Object Identifier | `doi = '10.1234/example'` | – |
| `platform` | string | Platform name (array-backed) | `platform = 'Sentinel-2'` | Dynamic (DB) |
| `processingLevel` | string | Processing level (array-backed) | `processingLevel = 'L2A'` | Dynamic (DB) |
| `constellation` | string | Satellite constellation (array-backed) | `constellation = 'Sentinel'` | Dynamic (DB) |
| `keywords` | string | Keyword tag (array-backed) | `keywords = 'Atmosphere'` | |
| `provider` | string | Data provider name (JSONB-backed) | `provider = 'ESA'` | Dynamic (DB) |
| `temporal_start` | string (date-time) | Start of temporal extent | `temporal_start >= '2020-01-01T00:00:00Z'` | – |
| `temporal_end` | string (date-time) | End of temporal extent | `temporal_end <= '2022-12-31T23:59:59Z'` | – |

### Semantics of Array-Backed Fields

The properties `platform`, `processingLevel` and `constellation` are backed by PostgreSQL `text[]` columns.  
For these fields, the following semantics apply:

**`=`**  
Matches collections where the array contains the given value.
```
platform = 'Sentinel-2'
```

**`!=`**  
Matches collections where the array does not contain the given value.

**`IN (...)`**  
Matches collections where the array contains at least one of the given values.
```
keywords IN ('Atmosphere', 'CO')
```

This behavior corresponds to array membership, not exact array equality.

### Provider Filtering Semantics

The `provider` queryable is a virtual field backed by the JSONB column `providers`.  
Filtering is applied to:
- `providers[*].name`

**Semantics:**
```
provider = 'ESA'
```
Matches all collections that have at least one provider with name `ESA`.  
Collections may still contain additional providers.

This behavior is intentional and reflects the fact that collections can have multiple providers.

### Spatial Filtering

Spatial filtering is supported via the standard `bbox` query parameter on `/collections`.  
The `spatial_extent` geometry is **not** filtered via CQL2.

Bounding box filtering is handled independently using:
```
bbox=minX,minY,maxX,maxY
```

### Temporal Filtering

Temporal filtering can be performed using either:

**CQL2 filters:**
```
temporal_start >= '2020-01-01T00:00:00Z'
temporal_end <= '2022-12-31T23:59:59Z'
```

**Or the `datetime` parameter**  
(as defined by the STAC Collection Search specification).

### Dynamic Enum Values

The following fields expose dynamic enum values derived from the database:
- `license`
- `platform`
- `processingLevel`
- `constellation`
- `provider`

This ensures:
- The UI always presents valid filter options
- The queryables schema stays in sync with the stored metadata

---

## Examples

### Example: Retrieve Queryables Schema
```bash
curl "http://localhost:4000/collections/queryables"
```
Returns the full JSON Schema describing all filterable fields.

---

## Error Responses

### 500 Internal Server Error
Returned if the queryables schema cannot be generated.
```json
{
  "error": "Internal server error"
}
```

---

## OGC / STAC Conformance Notes

This endpoint:
- Returns a valid Queryables JSON Schema (`type: object`)
- Accurately documents all supported filterable fields
- Uses dynamic enums sourced from the database
- Clearly distinguishes between scalar, array-backed, and JSONB-backed fields
- Aligns UI filter options with actual backend filter semantics
- Avoids advertising unsupported CQL2 spatial filters
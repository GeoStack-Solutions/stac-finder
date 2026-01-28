# Collections Endpoints

## Overview

The Collections endpoints provide access to STAC Collection metadata following the STAC API Specification. Collections represent datasets or groups of related geospatial assets.

**Available Endpoints:**
- `GET /collections` - List all collections with filtering, sorting, and pagination
- `GET /collections/{id}` - Retrieve a specific collection by ID

---

## GET /collections

Returns a list of all available STAC Collections with support for filtering, sorting, and pagination.

### Request

```
GET /collections
```

### Query Parameters

The endpoint supports multiple query parameters that can be combined:

| Parameter | Type | Description | Documentation |
|-----------|------|-------------|---------------|
| `q` | string | Free-text search across collection metadata | [Free-text search](query-param/free-text-search.md) |
| `datetime` | string | Temporal filter using ISO8601 intervals | [Datetime Filtering](query-param/datetime.md) |
| `bbox` | string | Spatial filter as bounding box coordinates | [Bounding Box Filtering](query-param/bbox.md) |
| `filter` | string | CQL2 filter expression for complex queries | [CQL2 Filtering](query-param/cql2-text.md) |
| `filter-lang` | string | Filter language specification (cql2-text, cql2-json) | [CQL2 Filtering](query-param/cql2-text.md) |
| `sortby` | string | Sort by field with direction prefix | [Sorting](query-param/sorting.md) |
| `limit` | integer | Maximum number of results per page | [Pagination](query-param/pagination.md) |
| `token` | string | Opaque pagination token | [Pagination](query-param/pagination.md) |

### Response

Returns a JSON object containing an array of collections and pagination links.

**Response Structure:**
```json
{
  "collections": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "extent": {
        "spatial": {
          "bbox": [[-180, -90, 180, 90]]
        },
        "temporal": {
          "interval": [
            [
              "2020-01-01T00:00:00Z", 
              "2020-12-31T23:59:59Z"
            ]
          ]
        }
      },
      "license": "string",
      "keywords": ["string"],
      "providers": [
        {
          "name": "string"
        }
      ],
      "links": [
        {
          "rel": "self",
          "href": "/collections/123",
          "type": "application/json"
        }
      ]
    }
  ],
  "links": [
    {
      "rel": "self",
      "href": "/collections?limit=10",
      "type": "application/json"
    },
    {
      "rel": "next",
      "href": "/collections?limit=10&token=xyz",
      "type": "application/json"
    }
  ]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `collections` | array | Array of STAC Collection objects (simplified) |
| `collections[].id` | string | Unique collection identifier |
| `collections[].title` | string | Human-readable collection title |
| `collections[].description` | string | Detailed description of the collection |
| `collections[].extent` | object | Spatial and temporal extent of the collection |
| `collections[].extent.spatial.bbox` | array | Bounding box coordinates [minx, miny, maxx, maxy] |
| `collections[].extent.temporal.interval` | array | Temporal interval [[start, end]] (ISO8601) |
| `collections[].license` | string | Collection license |
| `collections[].keywords` | array | Collection keywords for discovery |
| `collections[].providers` | array | Data providers information |
| `collections[].links` | array | Links to related resources (self) |
| `links` | array | Pagination links (self, next, prev) |

### Examples

#### Example 1: Get all collections (default)
```bash
curl "http://localhost:4000/collections"
```
Returns the first 10 collections.

#### Example 2: Search and filter
```bash
curl "http://localhost:4000/collections?q=sentinel&datetime=2020-01-01/2020-12-31"
```
Returns Sentinel collections from 2020.

#### Example 3: Sort and paginate
```bash
curl "http://localhost:4000/collections?sortby=-title&limit=25"
```
Returns 25 collections sorted by title (descending).

#### Example 4: Complex query
```bash
curl "http://localhost:4000/collections?q=landsat&datetime=2015-01-01/..&sortby=title&limit=50"
```
Returns up to 50 Landsat collections from 2015 onwards, sorted alphabetically.

### Error Responses

#### 400 Bad Request
Returned when query parameters are invalid.

**Invalid datetime:**
```json
{
  "error": "Invalid datetime",
  "message": "Invalid start datetime: not-a-date"
}
```

**Invalid sortby:**
```json
{
  "error": "Invalid sortby parameter",
  "message": "Field must be one of: id, title, description, license"
}
```

**Invalid limit:**
```json
{
  "error": "Invalid limit parameter",
  "message": "limit must be a positive integer"
}
```

**Search query too long:**
```json
{
  "error": "Invalid search query",
  "message": "Search query is too long (maximum 200 characters)"
}
```

#### 500 Internal Server Error
Returned when a server error occurs.

```json
{
  "error": "Internal server error"
}
```

---

## GET /collections/{id}

Retrieves complete metadata for a specific STAC Collection identified by its ID.

### Request

```
GET /collections/{id}
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Unique identifier of the collection |

### Response

Returns a complete STAC Collection object (v1.0.0).

**Response Structure:**
```json
{
  "stac_version": "1.0.0",
  "type": "Collection",
  "id": "string",
  "title": "string",
  "description": "string",
  "extent": {
    "spatial": {
      "bbox": [[-180, -90, 180, 90]]
    },
    "temporal": {
      "interval": [["2020-01-01T00:00:00Z", "2020-12-31T23:59:59Z"]]
    }
  },
  "license": "string",
  "keywords": ["string"],
  "providers": [
    {
      "name": "string"
    }
  ],
  "summaries": {
    "doi": ["string"],
    "platform": ["string"],
    "constellation": ["string"],
    "gsd": [number],
    "processing:level": ["string"]
  },
  "links": [
    {
      "rel": "self",
      "href": "/collections/123",
      "type": "application/json"
    },
    {
      "rel": "root",
      "href": "/",
      "type": "application/json"
    },
    {
      "rel": "parent",
      "href": "/collections",
      "type": "application/json"
    }
  ]
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `stac_version` | string | STAC specification version (1.0.0) |
| `type` | string | Always "Collection" |
| `id` | string | Unique collection identifier |
| `title` | string | Human-readable collection title |
| `description` | string | Detailed description of the collection |
| `extent` | object | Spatial and temporal extent |
| `extent.spatial.bbox` | array | Bounding box [minx, miny, maxx, maxy] |
| `extent.temporal.interval` | array | Temporal interval [[start, end]] |
| `license` | string | Collection license |
| `keywords` | array | Collection keywords |
| `providers` | array | Data providers |
| `summaries` | object | Summary statistics of item properties |
| `summaries.doi` | array | Digital Object Identifiers |
| `summaries.platform` | array | Platform names (e.g., "Sentinel-2A") |
| `summaries.constellation` | array | Constellation names (e.g., "Sentinel-2") |
| `summaries.gsd` | array | Ground Sample Distance values (meters) |
| `summaries.processing:level` | array | Processing levels (e.g., "L1C", "L2A") |
| `links` | array | Links to related resources |

**Link Relations:**
- `self` - Link to this collection
- `root` - Link to API root
- `parent` - Link to collections list

### Examples

#### Example 1: Get specific collection
```bash
curl "http://localhost:4000/collections/123"
```
Returns complete metadata for collection with ID 123.

#### Example 2: Using the link from list
```bash
# First, list collections
curl "http://localhost:4000/collections?q=sentinel&limit=1"

# Then follow the 'self' link from a collection
curl "http://localhost:4000/collections/456"
```

### Error Responses

#### 404 Not Found
Returned when the collection with the specified ID does not exist.

```json
{
  "error": "Collection not found",
  "message": "No collection with id \"999\" found"
}
```

#### 500 Internal Server Error
Returned when a server error occurs.

```json
{
  "error": "Internal server error"
}
```

---

## STAC Conformance

These endpoints follow the STAC API Specification:

### GET /collections
- Returns array of STAC Collection objects
- Supports pagination with `limit` parameter
- Provides `self`, `next`, and `prev` links
- Supports filtering by datetime, bbox and cql2-filters
- Supports free-text search
- Supports sorting (STAC Sort Extension)
- All query parameters can be combined

### GET /collections/{id}
- Returns complete STAC Collection object (v1.0.0)
- Includes `stac_version` and `type` fields
- Provides complete extent information
- Includes summaries of item properties
- Provides standard link relations (self, root, parent)

## Related Documentation

- [Free-text search](filtering/free-text-search.md) - free-text search filtering details
- [Datetime Filtering](filtering/datetime.md) - Temporal filtering details
- [Bounding Box Filtering](filtering/bbox.md) - Bounding filtering details
- [CQL2-text Filtering](filtering/cql2-text.md) - CQL2-text filtering details
- [CQL2-json Filtering](filtering/cql2-json.md) - CQL2-json filtering details
- [Sorting](sorting.md) - Sorting parameters and behavior
- [Pagination](pagination.md) - Pagination mechanics and links
- [Health Check](health.md) - API health monitoring
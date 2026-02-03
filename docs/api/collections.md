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


Returns a JSON object containing an array of collections, pagination links, and metadata fields.

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
      "rel": "first",
      "href": "/collections?limit=10",
      "type": "application/json"
    },
    {
      "rel": "last",
      "href": "/collections?limit=10&token=abc",
      "type": "application/json"
    },
    {
      "rel": "next",
      "href": "/collections?limit=10&token=xyz",
      "type": "application/json"
    },
    {
      "rel": "prev",
      "href": "/collections?limit=10&token=uvw",
      "type": "application/json"
    }
  ],
  "numberReturned": 10,
  "numberMatched": 123
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
| `collections[].summaries` | object | Summary statistics of item properties (only present if non-empty) |
| `links` | array | Pagination links (self, first, last, next, prev) |
| `numberReturned` | integer | Number of collections actually returned |
| `numberMatched` | integer | Total number of collections matching the query |

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

---

## Optional Fields Handling

### Overview

Collections in STAC have required and optional fields. This section documents how the API handles collections with missing or incomplete optional fields.

### Optional Fields

The following fields are **optional** in STAC Collections and may be missing, null, or empty:

- `keywords` - Array of keywords for discovery
- `sci:doi` (in summaries) - Digital Object Identifier
- `summaries` - Summary statistics (entire object may be absent)
- `description` - May be empty string or whitespace-only
- `providers` - Provider information array
- Other extension properties (eo:*, sar:*, etc.)

### Required Fields

These fields are **always present** per STAC specification:

- `id` - Unique collection identifier
- `title` - Human-readable collection title
- `extent` - Spatial and temporal extent
- `license` - Collection license
- `stac_version` - STAC version (for GET /collections/{id})
- `type` - Always "Collection" (for GET /collections/{id})
- `links` - Array of links

### API Behavior with Missing Fields

#### Free-Text Search (`q` parameter)

The API searches across multiple fields. When fields are missing:

**Behavior:**
- Searches in: `title`, `description`, `keywords` (if present)
- **Missing `description`**: Search only checks `title` and `keywords`
- **Missing `keywords`**: Search only checks `title` and `description`
- Collections with partial matches are still returned

**Example:**
```bash
# Returns collections matching "landsat" even if description or keywords are missing
curl "http://localhost:4000/collections?q=landsat"
```

**Real-world data:**
- All collections have `keywords` field
- 28 collections have missing or empty `summaries`
- 50 collections have no DOI in summaries

#### CQL2 Filtering

When filtering on optional fields that are missing:

**Behavior:**
- **`IS NULL` checks**: Works correctly, returns collections where field is missing
- **`IS NOT NULL` checks**: Excludes collections with missing field
- **`LIKE` or `=` on missing fields**: Collections without the field are excluded from results
- **No errors thrown**: API gracefully handles missing fields in queries

**Examples:**
```bash
# Find collections with DOI
curl 'http://localhost:4000/collections?filter-lang=cql2-json&filter={"op":"isNull","args":[{"property":"sci:doi"}],"negate":true}'

# Find collections with keywords containing "eo"
curl 'http://localhost:4000/collections?filter-lang=cql2-json&filter={"op":"in","args":[{"property":"keywords"},["eo","satellite"]]}'
```

**Note:** CQL2-text implementation may return `400 Bad Request` if parser is not fully implemented. Use CQL2-json for better compatibility.

#### Sorting

Sorting works reliably on required fields:

**Behavior:**
- **Sorting by `title`**: Always works (required field)
- **Sorting by optional fields**: May have inconsistent behavior
- Collections are never excluded from results due to missing sort fields

**Example:**
```bash
# Reliable - title is required
curl "http://localhost:4000/collections?sortby=title"

# May have issues - license may vary
curl "http://localhost:4000/collections?sortby=license"
```

#### Pagination

Pagination works transparently with missing fields:

**Behavior:**
- Collections with missing fields are included in pagination
- Filter consistency maintained across pages
- Token-based pagination handles varying field presence

**Example:**
```bash
# First page
curl "http://localhost:4000/collections?limit=10"

# Next page (includes collections with missing optional fields)
curl "http://localhost:4000/collections?limit=10&token=xyz"
```

### Edge Cases

#### Collections with Only Required Fields

**Behavior:** Collections with minimal STAC fields are fully supported:

```json
{
  "id": "minimal-collection",
  "title": "Minimal Collection",
  "description": "",
  "extent": {
    "spatial": {"bbox": [[-180, -90, 180, 90]]},
    "temporal": {"interval": [[null, null]]}
  },
  "license": "proprietary",
  "links": [...]
}
```

Such collections:
-  Are returned in listings
-  Can be filtered by required fields
-  Are included in pagination
-  Never cause null pointer exceptions

#### Null vs Undefined vs Empty Array

**Handling:**
- `null` - Field exists but has no value
- `undefined` - Field is completely absent from JSON
- `[]` - Empty array (for keywords, providers, etc.)

**API treats all three equivalently:**
- Free-text search skips the field
- CQL2 filters treat as "field not present"
- No errors or exceptions thrown

### Client Implementation Recommendations

When consuming this API, handle optional fields gracefully:

```javascript
//  Safe access patterns
const keywords = collection.keywords || [];
const doi = collection.summaries?.doi?.[0] || 'N/A';
const description = collection.description?.trim() || 'No description';

//  Check before accessing
if (collection.sci && collection.sci.doi) {
  displayDOI(collection.sci.doi);
}

//  Use optional chaining
const platformName = collection.summaries?.platform?.[0];
```

**Best Practices:**
- Always use optional chaining (`?.`) for nested optional fields
- Provide defaults for missing fields in UI displays
- Don't assume summaries object exists
- Check array length before accessing indices
- Handle empty strings as "missing" for description

### Data Quality Insights

Based on real database analysis:

| Field | Status | Collections Affected |
|-------|--------|---------------------|
| `keywords` | Always present | 0 missing |
| `sci:doi` | Optional | ~50 without DOI |
| `summaries` | Optional | ~28 missing/empty |
| `description` | Sometimes empty | ~15 empty strings |
| Multiple optional fields | Varies | ~59 with 2+ missing |

### Error Handling

The API **never throws null pointer exceptions** for missing optional fields:

-  Returns `200 OK` with filtered results
-  Returns empty arrays when no matches
-  Returns proper `400` for malformed queries (not missing fields)
-  Never returns `500` due to missing optional fields

**Example successful response with many missing fields:**
```json
{
  "collections": [
    {
      "id": "123",
      "title": "Collection with minimal fields",
      "description": "",
      "extent": {...},
      "license": "proprietary",
      "links": [...]
    }
  ],
  "links": [...],
  "numberReturned": 1,
  "numberMatched": 1
}
```

---

## Related Documentation

- [Free-text search](filtering/free-text-search.md) - free-text search filtering details
- [Datetime Filtering](filtering/datetime.md) - Temporal filtering details
- [Bounding Box Filtering](filtering/bbox.md) - Bounding filtering details
- [CQL2-text Filtering](filtering/cql2-text.md) - CQL2-text filtering details
- [CQL2-json Filtering](filtering/cql2-json.md) - CQL2-json filtering details
- [Sorting](sorting.md) - Sorting parameters and behavior
- [Pagination](pagination.md) - Pagination mechanics and links
- [Health Check](health.md) - API health monitoring
# STAC-Compliant Sorting

## Overview

The API supports STAC-compliant sorting via the `sortby` query parameter. The implementation follows the STAC API Sort Extension and enables sorting collections by multiple fields with configurable sort direction.

## Query Parameters

### `sortby`

Sorts collections based on one or more fields with optional direction prefix.

**Format:**
- Single field: `field` (ascending by default)
- Explicit ascending: `+field`
- Descending: `-field`
- Multiple fields: Comma-separated, e.g., `+field1,-field2`

**Allowed Fields:**
- `id` - Collection identifier
- `title` - Collection title
- `description` - Collection description
- `license` - Collection license

**Direction:**
- `+` or no prefix - Ascending (A-Z, 0-9)
- `-` - Descending (Z-A, 9-0)

## Supported Operations

### 1. Single Field Sorting
Sort by a single field in ascending order (default).

**Example:**
```
GET /collections?sortby=title
```

**Result:** Collections sorted alphabetically by title (A-Z)

### 2. Explicit Direction
Specify sort direction explicitly using `+` (ascending) or `-` (descending).

**Examples:**
```
GET /collections?sortby=+title     # Ascending (explicit)
GET /collections?sortby=-title     # Descending
```

**Result:** 
- `+title`: A-Z sorting
- `-title`: Z-A sorting

### 3. Multiple Field Sorting
Sort by multiple fields with independent directions.

**Example:**
```
GET /collections?sortby=+title,-id
```

**Result:** Collections sorted by:
1. Title ascending (A-Z)
2. ID descending (9-0) for collections with the same title

### 4. Combined with Other Parameters
Sorting can be combined with filtering and pagination.

**Examples:**
```
GET /collections?sortby=title&limit=10
GET /collections?sortby=-title&datetime=2020-01-01/..
GET /collections?sortby=+license,-title&q=sentinel
```

## Examples

### Example 1: Sort by title (ascending)
```bash
curl "/collections?sortby=title"
```
Returns collections ordered alphabetically by title.

### Example 2: Sort by title (descending)
```bash
curl "/collections?sortby=-title"
```
Returns collections in reverse alphabetical order.

### Example 3: Multi-field sorting
```bash
curl "/collections?sortby=+license,-title"
```
Returns collections sorted by license (ascending), then by title (descending) within each license group.

### Example 4: Combine with pagination
```bash
curl "/collections?sortby=title&limit=20"
```
Returns the first 20 collections sorted alphabetically.

### Example 5: Combine with filtering
```bash
curl "/collections?sortby=-title&datetime=2020-01-01/2020-12-31&q=sentinel"
```
Returns Sentinel collections from 2020, sorted by title in descending order.

## Error Handling

The API returns detailed error messages for invalid sort parameters:

### Invalid Field Name
```json
{
  "error": "Invalid sortby parameter",
  "message": "Field must be one of: id, title, description, license. Format: sortby=field, sortby=+field (ascending), or sortby=-field (descending)"
}
```

**Common causes:**
- Using a field name not in the allowed list
- Typos in field names
- Attempting to sort by fields not exposed in the API

### Invalid Format
Invalid formats are typically caught during parsing. The parameter should follow the pattern: `[+|-]field[,[+|-]field]*`

## Implementation Details

### Parsing Logic
The `parseSortby()` function in [sorting.js](../../api/utils/sorting.js) handles:
1. Splitting comma-separated sort fields
2. Extracting direction prefix (`+` or `-`)
3. Validating field names against whitelist
4. Building SQL `ORDER BY` clauses

### SQL Query Generation
The function generates parameterized SQL `ORDER BY` clauses:
```sql
SELECT * FROM collections ORDER BY title ASC, id DESC
```

### Security
- **Whitelist validation**: Only explicitly allowed columns can be used for sorting
- **SQL injection prevention**: Field names are validated against a whitelist before being used in queries
- **No user input in SQL**: Direction is mapped to `ASC`/`DESC` constants

### Integration
The sorting logic is integrated in the [collections.js](../../api/controllers/collections.js) controller and applied after filtering but before pagination.

**Query execution order:**
1. Filtering (WHERE clause)
2. Sorting (ORDER BY clause)
3. Pagination (LIMIT/OFFSET)

## STAC Conformance

This implementation follows the STAC API Sort Extension specification:
- Support for `sortby` query parameter
- Support for `+` (ascending) and `-` (descending) direction prefixes
- Support for multiple sort fields (comma-separated)
- Default ascending order when no prefix is specified
- Proper error handling for invalid field names
- Compatible with other query parameters (filtering, pagination)

**STAC API Extensions Compliance:**
- [STAC API - Sort Extension](https://github.com/stac-api-extensions/sort)
- [OGC API - Features - Part 1: Core](https://docs.ogc.org/is/17-069r4/17-069r4.html)

## Tests

Unit tests for sorting can be found in [sorting.test.js](../../api/tests/unit/sorting.test.js).

To run the tests:
```bash
cd api
npm test -- tests/unit/sorting.test.js
```

The tests cover:
- Single field sorting (ascending/descending)
- Multiple field sorting
- Default direction (ascending when no prefix)
- Field name validation
- Invalid field rejection
- Empty/null parameter handling
- Edge cases (whitespace, mixed directions)

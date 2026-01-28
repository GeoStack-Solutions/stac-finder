# Free-Text Search Filtering

## Overview

The API supports free-text search filtering via the `q` query parameter. This enables users to search across multiple collection metadata fields using simple text queries with case-insensitive matching and partial word matching.

## Query Parameters

### `q`

Performs a free-text search across multiple collection fields.

**Format:** String (single term or space-separated terms)

**Searchable Fields:**
- `title` - Collection title
- `description` - Collection description
- `license` - License information
- `keywords` - Collection keywords (array)
- `providers` - Provider names (array)

**Constraints:**
- **Maximum length**: 200 characters
- **Minimum length**: 1 character (after trimming)
- **Case sensitivity**: Case-insensitive (ILIKE matching)

**Behavior:**
- Multiple space-separated terms use OR logic (matches any term)
- Partial matching supported (e.g., "optic" matches "optical")
- Each term is searched across all fields
- Empty strings or whitespace-only queries are ignored

## Search Logic

### Single Term Search
A single search term matches collections where any of the searchable fields contains that term.

**Example:**
```
GET /collections?q=sentinel
```

**SQL Logic:**
```sql
WHERE (
  title ILIKE '%sentinel%' 
  OR description ILIKE '%sentinel%' 
  OR license ILIKE '%sentinel%' 
  OR array_to_string(keywords, ' ') ILIKE '%sentinel%'
  OR providers::text ILIKE '%sentinel%'
)
```

### Multiple Terms Search
Multiple space-separated terms use OR logic - collections matching ANY term are returned.

**Example:**
```
GET /collections?q=sentinel landsat
```

**SQL Logic:**
```sql
WHERE (
  (title ILIKE '%sentinel%' OR description ILIKE '%sentinel%' OR ...)
  OR
  (title ILIKE '%landsat%' OR description ILIKE '%landsat%' OR ...)
)
```

### Case-Insensitive Matching
All searches are case-insensitive using PostgreSQL's ILIKE operator.

**Examples:**
- `q=Sentinel` matches "sentinel", "SENTINEL", "Sentinel-2"
- `q=OPTICAL` matches "optical", "Optical", "OPTICAL"

### Partial Matching
Search terms match partial words within fields.

**Examples:**
- `q=optic` matches "optical", "optics", "electro-optical"
- `q=senti` matches "Sentinel", "Sentinel-2A"
- `q=land` matches "Landsat", "Iceland", "landscape"

## Examples

### Example 1: Search for Sentinel data
```bash
curl "/collections?q=sentinel"
```
Returns all collections with "sentinel" in any searchable field.

### Example 2: Search for multiple terms
```bash
curl "/collections?q=sentinel landsat"
```
Returns collections containing "sentinel" OR "landsat" in any field.

### Example 3: Search with partial match
```bash
curl "/collections?q=optic"
```
Returns collections with "optical", "optics", or any field containing "optic".

### Example 4: Case-insensitive search
```bash
curl "/collections?q=COPERNICUS"
```
Returns collections with "copernicus", "Copernicus", or "COPERNICUS".

### Example 5: Combine with datetime filter
```bash
curl "/collections?q=sentinel&datetime=2020-01-01/2020-12-31"
```
Returns Sentinel collections from 2020.

### Example 6: Combine with sorting and pagination
```bash
curl "/collections?q=landsat&sortby=title&limit=20"
```
Returns first 20 Landsat collections sorted by title.

### Example 7: Complex multi-filter query
```bash
curl "/collections?q=optical satellite&datetime=2015-01-01/..&sortby=-title&limit=50"
```
Returns up to 50 collections with "optical" OR "satellite", available from 2015 onwards, sorted by title descending.

## Error Handling

The API returns detailed error messages for invalid search queries:

### Query Too Long
```json
{
  "error": "Invalid search query",
  "message": "Search query is too long (maximum 200 characters)"
}
```

**Common cause:**
- Search query exceeds 200 characters

**Resolution:**
- Shorten the search query
- Use more specific terms
- Consider using multiple separate queries

## Implementation Details

### Search Pattern
Each search term is wrapped with wildcards for partial matching:
```javascript
const searchPattern = `%${term}%`;
```

### Array Field Handling
- **Keywords**: Converted to space-separated string using `array_to_string(keywords, ' ')`
- **Providers**: Cast to text using `providers::text` for searching

### SQL Query Generation
The `parseTextSearch()` function in [filtering.js](../../../api/utils/filtering.js) generates parameterized SQL WHERE clauses:
```javascript
// For query: "sentinel landsat"
// Generates:
WHERE (
  (title ILIKE $1 OR description ILIKE $1 OR license ILIKE $1 OR ...)
  OR
  (title ILIKE $2 OR description ILIKE $2 OR license ILIKE $2 OR ...)
)
// With params: ['%sentinel%', '%landsat%']
```

### Performance Considerations
- **Index usage**: Database uses indexes on text columns for ILIKE queries
- **Term limit**: No explicit limit on number of terms, but overall query length is capped
- **Wildcard matching**: Leading wildcards may prevent index usage on very large datasets

### Security
- **SQL Injection Prevention**: All search terms are parameterized (not interpolated)
- **Length validation**: Maximum length prevents potential abuse
- **Input sanitization**: Search terms are trimmed and validated
- **Special characters**: Handled safely by parameterized queries

### Integration
The search filter is integrated in the [collections.js](../../../api/controllers/collections.js) controller and can be combined with:
- Datetime filtering
- Bounding box filtering
- CQL2 filtering
- Sorting
- Pagination

**Query execution order:**
1. Apply all WHERE clauses (text search, datetime, bbox, CQL2)
2. Apply ORDER BY clauses (sorting)
3. Apply LIMIT and OFFSET (pagination)

## Use Cases

### Discovery by Keywords
Search for collections by common keywords:
```bash
curl "/collections?q=radar"
curl "/collections?q=multispectral"
curl "/collections?q=lidar"
```

### Provider-based Search
Find collections by provider name:
```bash
curl "/collections?q=ESA"
curl "/collections?q=USGS"
curl "/collections?q=copernicus"
```

### License-based Search
Search by license type:
```bash
curl "/collections?q=CC-BY"
curl "/collections?q=proprietary"
curl "/collections?q=open"
```

### Mission/Satellite Search
Find specific missions or satellites:
```bash
curl "/collections?q=sentinel-2"
curl "/collections?q=landsat-8"
curl "/collections?q=modis"
```

### Broad Topic Search
Search across multiple related terms:
```bash
curl "/collections?q=ocean water marine"
curl "/collections?q=forest vegetation land"
curl "/collections?q=climate temperature precipitation"
```

## Best Practices

### For API Clients
1. **Use specific terms**: More specific terms return more relevant results
2. **Combine filters**: Use with datetime/bbox for targeted searches
3. **Handle empty results**: Not all terms will match collections
4. **Case doesn't matter**: Use lowercase for consistency
5. **Space as OR**: Remember that spaces create OR logic, not AND

### For Users
1. **Start broad**: Begin with general terms, then refine
2. **Check keywords**: Review collection keywords for search ideas
3. **Use partial terms**: Don't worry about exact spelling
4. **Multiple attempts**: Try different term combinations
5. **Combine with filters**: Use datetime/bbox to narrow results

## Limitations

### AND Logic Not Supported
Currently, the search uses OR logic for multiple terms. Collections matching ANY term are returned.

**Current behavior:**
```
q=sentinel optical  →  Returns collections with "sentinel" OR "optical"
```

**Workaround:**
Use CQL2 filtering for AND logic:
```
filter=title LIKE '%sentinel%' AND title LIKE '%optical%'&filter-lang=cql2-text
```

### No Phrase Search
Exact phrase matching is not supported.

**Current behavior:**
```
q=sentinel 2  →  Matches "sentinel" OR "2" (not the phrase "sentinel 2")
```

**Workaround:**
Use more specific single terms or CQL2 filtering.

### No Field-Specific Search
Cannot limit search to specific fields via the `q` parameter.

**Workaround:**
Use CQL2 filtering for field-specific searches:
```
filter=title LIKE '%sentinel%'&filter-lang=cql2-text
```

## STAC Conformance

This implementation provides basic free-text search functionality:
- Case-insensitive matching
- Partial word matching
- Multiple field search
- Compatible with other query parameters
- Proper error handling
- OR logic only (no AND logic via q parameter)
- No phrase search support
- No field-specific search via q parameter

**Note:** For advanced filtering requirements (AND logic, field-specific searches, complex expressions), use the CQL2 filtering capabilities.

## Tests

Unit tests for free-text search filtering can be found in [free-text-search.test.js](../../../api/tests/unit/free-text-search.test.js).

To run the tests:
```bash
cd api
npm test -- tests/unit/free-text-search.test.js
```

The tests cover:
- Single term search
- Multiple term search (OR logic)
- Case-insensitive matching
- Partial matching
- Empty/null query handling
- Whitespace-only query handling
- Maximum length validation (200 characters)
- Special characters handling
- SQL parameter generation
- Integration with other filters

# STAC-Compliant Temporal Filtering

## Overview

The API now supports STAC-compliant temporal filtering via the `datetime` query parameter. The implementation is based on the STAC API Specification standard and enables filtering by time intervals with support for BEFORE, AFTER, DURING, and CONTAINS operations.

## Query Parameters

### `datetime`

Filters collections based on their temporal extent.

**Format:**
- Single timestamp: `YYYY-MM-DDTHH:MM:SSZ`
- Closed interval: `START/END`
- Open-ended interval (after): `START/..`
- Open-ended interval (before): `../END`
- Fully open: `../..` (no filtering)

## Supported Operations

### 1. CONTAINS (Single Timestamp)
Finds collections that contain the specified timestamp.

**Example:**
```
GET /collections?datetime=2020-06-15T12:00:00Z
```

**Logic:**
- Collection is returned when: `temporal_start <= 2020-06-15T12:00:00Z` AND `(temporal_end >= 2020-06-15T12:00:00Z OR temporal_end IS NULL)`
- Collections with open-ended temporal extents (NULL end date) are included

### 2. DURING (Closed Interval)
Finds collections whose temporal extent overlaps with the specified interval.

**Example:**
```
GET /collections?datetime=2020-01-01T00:00:00Z/2020-12-31T23:59:59Z
```

**Logic:**
- Collection is returned when: `temporal_start <= 2020-12-31T23:59:59Z` AND `(temporal_end >= 2020-01-01T00:00:00Z OR temporal_end IS NULL)`
- Overlap: The collection must overlap the interval fully or partially
- Collections with open-ended temporal extents are included if they started before the interval end

### 3. AFTER (Open End)
Finds collections that end on or after the specified timestamp.

**Example:**
```
GET /collections?datetime=2020-06-01T00:00:00Z/..
```

**Logic:**
- Collection is returned when: `temporal_end >= 2020-06-01T00:00:00Z OR temporal_end IS NULL`
- Collections with open-ended temporal extents (ongoing) are always included

### 4. BEFORE (Open Start)
Finds collections that start on or before the specified timestamp.

**Example:**
```
GET /collections?datetime=../2020-06-30T23:59:59Z
```

**Logic:**
- Collection is returned when: `temporal_start <= 2020-06-30T23:59:59Z`

## Supported Date Formats

The API accepts various ISO8601-compliant date formats:

- Full date with time and UTC: `2020-06-15T12:30:45Z`
- Date with time and timezone: `2020-06-15T12:30:45+02:00`
- Date with milliseconds: `2020-06-15T12:30:45.123Z`
- Date only: `2020-06-15`

## Examples

### Example 1: Collections for a specific month
```bash
curl "/collections?datetime=2020-06-01T00:00:00Z/2020-06-30T23:59:59Z"
```

### Example 2: Collections available after 2021
```bash
curl "/collections?datetime=2021-01-01T00:00:00Z/.."
```

### Example 3: Collections available before 2019
```bash
curl "/collections?datetime=../2019-12-31T23:59:59Z"
```

### Example 4: Collections for a specific day
```bash
curl "/collections?datetime=2020-07-04"
```

### Example 5: Combination with other filters
```bash
curl "/collections?datetime=2020-01-01/2020-12-31&q=sentinel&limit=10"
```

## Error Handling

The API returns detailed error messages for:

### Invalid Format
```json
{
  "error": "Invalid datetime format",
  "message": "datetime must be a string"
}
```

### Invalid Date
```json
{
  "error": "Invalid datetime",
  "message": "Invalid start datetime: not-a-date"
}
```

### Invalid Interval
```json
{
  "error": "Invalid datetime interval",
  "message": "Start datetime must be before end datetime"
}
```

## Implementation Details

### Database Schema
The filtering uses the following columns in the `collections` table:
- `temporal_start`: Collection start date (TIMESTAMP)
- `temporal_end`: Collection end date (TIMESTAMP, nullable for ongoing collections)

### Open-Ended Temporal Extents
Collections with `temporal_end = NULL` represent ongoing or open-ended temporal coverage. These collections:
- Are included in single timestamp queries if the timestamp is after their start date
- Are included in interval queries if the interval overlaps with their temporal extent
- Are always included in open-ended "AFTER" queries

### SQL Query Generation
The `parseDatetimeFilter()` function in [filtering.js](api/utils/filtering.js) generates parameterized SQL WHERE clauses to prevent SQL injection.

### Integration
The filter is integrated in the [collections.js](api/controllers/collections.js) controller and can be combined with other filters (such as text search).

## STAC Conformance

This implementation follows the STAC API Specification for temporal filtering:
- Support for ISO8601 date formats
- Support for intervals with `/` separator
- Support for open-ended intervals with `..`
- Logical overlap checking
- Correct handling of single timestamps
- Support for NULL temporal_end (open-ended collections)

## Tests

Unit tests for datetime filtering can be found in [datetime.test.js](api/tests/unit/datetime.test.js).

To run the tests:
```bash
cd api
npm test -- tests/unit/datetime.test.js
```

The tests cover:
- All supported formats
- Error handling
- Edge cases
- STAC operations (BEFORE, AFTER, DURING, CONTAINS)

# CQL2-text Filtering

## Overview

The CQL2-text filtering mechanism allows clients to express complex filter conditions for the  
`GET /collections` endpoint using a textual Common Query Language (CQL2).

CQL2 filters are provided via the `filter` query parameter and evaluated server-side against
collection metadata fields defined in the `/collections/queryables` endpoint.

This implementation supports logical operators, comparison operators, array membership,
and temporal interval filtering.

---

## Usage

CQL2 filters are applied using the following query parameters:

| Parameter | Type | Required | Description |
|----------|------|----------|-------------|
| `filter` | string | No | CQL2-text filter expression |
| `filter-lang` | string | No | Filter language identifier (`cql2-text`) |

If `filter-lang` is omitted, `cql2-text` is assumed.

---

## Supported Fields (Queryables)

The following fields can be used in CQL2 filter expressions.

### Scalar Fields

| Field | Type | Description |
|------|------|-------------|
| `id` | string | Collection identifier |
| `title` | string | Collection title |
| `description` | string | Collection description |
| `license` | string | License identifier or title |
| `doi` | string | Digital Object Identifier |

### Array Fields

| Field | Type | Description |
|------|------|-------------|
| `keywords` | array(string) | Collection keywords |
| `platform_summary` | array(string) | Platform names |
| `constellation_summary` | array(string) | Constellation names |
| `gsd_summary` | array(string) | Ground Sampling Distance categories |
| `processing_level_summary` | array(string) | Processing levels |

### Temporal Field

| Field | Type | Description |
|------|------|-------------|
| `temporal_extent` | interval | Temporal extent of the collection |

**Note:**  
`temporal_extent` is a virtual field and is internally mapped to the database columns  
`temporal_start` and `temporal_end`.

---

## Supported Operators

### Spatial Operators

Spatial functions allow advanced spatial filtering on geometry fields (e.g., `spatial_extent`). Supported functions:

| Function             | Description                                 |
|----------------------|---------------------------------------------|
| `S_INTERSECTS`       | Intersects (default for bbox)               |
| `S_WITHIN`           | Geometry is within the bbox                 |
| `S_CONTAINS`         | Geometry contains the bbox                  |
| `S_OVERLAPS`         | Geometry overlaps the bbox                  |

**Example:**
```cql
S_WITHIN(spatial_extent, BBOX(5.8, 47.2, 15.0, 55.1))
```

### Logical Operators

| Operator | Description |
|---------|-------------|
| `AND` | Logical conjunction |
| `OR` | Logical disjunction |
| `NOT` | Logical negation |
| `( )` | Grouping expressions |

---

### Comparison Operators

Supported for scalar fields (`id`, `title`, `description`, `license`, `doi`):

| Operator | Description |
|---------|-------------|
| `=` | Equality |
| `<>` | Inequality |
| `<` | Less than (timestamps only) |
| `>` | Greater than (timestamps only) |
| `LIKE` | Case-insensitive pattern matching |

**Example:**
```bash
title LIKE '%Sentinel%'
```
---

### IN Operator (Arrays & Scalars)

The `IN` operator is used for membership checks.

| Field Type | Semantics |
|-----------|-----------|
| scalar (`text`) | value equals any element in the list |
| array (`text[]`) | array overlaps with the provided values |

**Examples:**
```bash 
keywords IN ('eo', 'sar')
platform_summary IN ('Sentinel-2')
license IN ('CC-BY-4.0', 'proprietary')
```
## BETWEEN Operator (Temporal Filtering)

The `BETWEEN` operator is used for temporal interval filtering on `temporal_extent`.

### Syntax
```bash
temporal_extent BETWEEN <start> AND <end>
Semantics
A collection matches if its temporal interval overlaps the specified interval.
```
### Semantics

A collection matches if its temporal interval overlaps the specified interval.
Internally evaluated as:

```bash
temporal_start <= end AND temporal_end >= start
```

**Example**
```bash
temporal_extent BETWEEN '2020-01-01T00:00:00Z' AND '2020-12-31T23:59:59Z'
```
## Combining Filters

Multiple conditions can be combined using logical operators.

### Example 1: AND combination
```bash
platform_summary IN ('Sentinel-2')
AND temporal_extent BETWEEN '2020-01-01T00:00:00Z' AND '2020-12-31T23:59:59Z'
```

### Example 2: OR combination
```bash
Code kopieren
license = 'CC-BY-4.0' OR license = 'proprietary'
```

### Example 3: NOT expression
```bash
Code kopieren
NOT keywords IN ('deprecated')
```

### Example 4: Complex expression
```bash
Code kopieren
(title LIKE '%Sentinel%' OR title LIKE '%Landsat%')
AND processing_level_summary IN ('L2A')
AND temporal_extent BETWEEN '2018-01-01T00:00:00Z' AND '2022-12-31T23:59:59Z'
```

## Unsupported Operations
The following combinations are not supported and will result in a 400 Bad Request:

- LIKE on array fields
- IN on temporal_extent
- = or < / > on temporal_extent
- BETWEEN on text fields

## Error Responses
### Invalid CQL2 Filter
Returned when the filter expression is syntactically invalid or uses unsupported operators.

```bash
Code kopieren
{
  "error": "Invalid CQL2 filter",
  "message": "Unknown queryable: temporal_extent"
}
```

### Unsupported Operator
```bash
Code kopieren
{
  "error": "Invalid CQL2 filter",
  "message": "BETWEEN not supported for text field title"
}
```
## Related Documentation

- [`GET /collections`](api/collections.md) – Collections endpoint  
- [`/collections/queryables`](api/queryables.md) – Available queryable fields  
- [Datetime Filtering](datetime.md)  
- [Bounding Box Filtering](bbox.md)

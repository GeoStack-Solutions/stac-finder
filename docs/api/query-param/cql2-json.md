# CQL2-json Filtering

## Overview

The CQL2-json filtering mechanism allows clients to express complex filter conditions for the  
`GET /collections` endpoint using a structured JSON representation of the Common Query Language (CQL2).

CQL2-json filters are provided via the `filter` query parameter in JSON format and evaluated
server-side against collection metadata fields defined in the `/collections/queryables` endpoint.

This format is especially suitable for programmatic clients, as it avoids parsing ambiguities
and allows structured construction of filter expressions.

---

## Usage

CQL2-json filters are applied using the following query parameters:

| Parameter | Type | Required | Description |
|----------|------|----------|-------------|
| `filter` | object (JSON) | No | CQL2-json filter expression |
| `filter-lang` | string | No | Filter language identifier (`cql2-json`) |

When using JSON filters, `filter-lang=cql2-json` **must** be specified.

---

## Supported Fields (Queryables)

The following fields can be used in CQL2-json filter expressions.

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

Spatial operators allow advanced spatial filtering on geometry fields (e.g., `spatial_extent`). Supported operators:

| Operator         | Description                                 |
|------------------|---------------------------------------------|
| `s_intersects`   | Intersects (default for bbox)               |
| `s_within`       | Geometry is within the bbox                 |
| `s_contains`     | Geometry contains the bbox                  |
| `s_overlaps`     | Geometry overlaps the bbox                  |

**Example:**
```json
{
  "op": "s_within",
  "args": [
    { "property": "spatial_extent" },
    { "type": "BBox", "value": [5.8, 47.2, 15.0, 55.1] }
  ]
}
```
### Logical Operators

| Operator | Description |
|---------|-------------|
| `and` | Logical conjunction |
| `or` | Logical disjunction |
| `not` | Logical negation |

---

### Comparison Operators

Supported for scalar fields (`id`, `title`, `description`, `license`, `doi`):

| Operator | Description |
|---------|-------------|
| `=` | Equality |
| `<>` | Inequality |
| `<` | Less than (timestamps only) |
| `>` | Greater than (timestamps only) |
| `like` | Case-insensitive pattern matching |

---

## IN Operator (Arrays & Scalars)

The `in` operator is used for membership checks.

| Field Type | Semantics |
|-----------|-----------|
| scalar (`text`) | value equals any element in the list |
| array (`text[]`) | array overlaps with the provided values |

### Example
```bash
{
  "op": "in",
  "args": [
    { "property": "keywords" },
    ["eo", "sar"]
  ]
}
```

## BETWEEN Operator (Temporal Filtering)

The between operator is used for temporal interval filtering on temporal_extent.

### Semantics

A collection matches if its temporal interval overlaps the specified interval.

Internally evaluated as:
```bash
temporal_start <= end AND temporal_end >= start
```

### Example
``` bash
{
  "op": "between",
  "args": [
    { "property": "temporal_extent" },
    "2020-01-01T00:00:00Z",
    "2020-12-31T23:59:59Z"
  ]
}
```
## Combining Filters

Multiple conditions can be combined using logical operators.

## Example 1: AND combination
``` bash
{
  "op": "and",
  "args": [
    {
      "op": "in",
      "args": [
        { "property": "platform_summary" },
        ["Sentinel-2"]
      ]
    },
    {
      "op": "between",
      "args": [
        { "property": "temporal_extent" },
        "2020-01-01T00:00:00Z",
        "2020-12-31T23:59:59Z"
      ]
    }
  ]
}
```

### Example 2: OR combination
``` bash
{
  "op": "or",
  "args": [
    {
      "op": "=",
      "args": [
        { "property": "license" },
        "CC-BY-4.0"
      ]
    },
    {
      "op": "=",
      "args": [
        { "property": "license" },
        "proprietary"
      ]
    }
  ]
}
``` 

### Example 3: NOT expression
``` bash
{
  "op": "not",
  "args": [
    {
      "op": "in",
      "args": [
        { "property": "keywords" },
        ["deprecated"]
      ]
    }
  ]
}
```

### Unsupported Operations

The following combinations are not supported and will result in a 400 Bad Request:

- like on array fields
- in on temporal_extent
- = or < / > on temporal_extent
- between on text fields

## Error Responses
### Invalid CQL2 Filter

Returned when the filter expression is syntactically invalid or uses unsupported operators.
``` bash
{
  "error": "Invalid CQL2 filter",
  "message": "Unknown queryable: temporal_extent"
}
```  

### Unsupported Operator
``` bash
{
  "error": "Invalid CQL2 filter",
  "message": "BETWEEN not supported for text field title"
}
```

## Related Documentation

- [`GET /collections`](../collections.md) – Collections endpoint  
- [`/collections/queryables`](../collections-queryables.md) – Available queryable fields  
- [CQL2-text Filtering](cql2-text.md)  
- [Datetime Filtering](datetime.md)  
- [Bounding Box Filtering](bbox.md)

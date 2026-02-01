# Bounding Box Filtering

## Overview

The `bbox` parameter allows spatial filtering of collections based on geographic bounding boxes. Collections whose spatial extent intersects with the provided bounding box are returned. This follows the STAC API specification for bounding box filtering.

---

## Query Parameter

### `bbox`

Filters collections by spatial intersection with a bounding box.

**Format:**
```
bbox=minx,miny,maxx,maxy
```

Or with altitude (z-values are ignored for 2D filtering):
```
bbox=minx,miny,minz,maxx,maxy,maxz
```

**Coordinates:**
- Values must be in WGS84 (EPSG:4326) coordinate system
- `minx`, `maxx`: Longitude values (-180 to 180)
- `miny`, `maxy`: Latitude values (-90 to 90)
- Coordinates define the southwest and northeast corners of the bounding box

---

## Spatial Filter Behavior

### Standard Bounding Box
When `minx <= maxx`, the filter uses a single rectangular bounding box:
```
┌─────────────────┐ maxy
│                 │
│    Query Box    │
│                 │
└─────────────────┘ miny
minx            maxx
```

### Anti-Meridian Crossing
When `minx > maxx`, the bounding box crosses the anti-meridian (180°/-180° longitude line). The filter automatically splits this into two boxes:
```
──────┐         ┌────── 180°/-180°
      │ Box B   │ Box A
      │         │
──────┘         └────── 
    maxx      minx
```

This allows querying regions that span across the International Date Line.

### Intersection Logic
A collection is returned if its `spatial_extent` **intersects** with the query bounding box. This means:
- Collections fully contained within the bbox are returned
- Collections partially overlapping the bbox are returned
- Collections completely outside the bbox are excluded

---

## Advanced Spatial Filtering

The standard `bbox` parameter always uses spatial intersection. For advanced spatial operations such as `within`, `contains`, or `overlaps`, use the [CQL2 filtering](cql2-text.md) (`cql2-text` or `cql2-json`).

See the CQL2 documentation for details on spatial operators.

---

## Examples

### Example 1: Simple bounding box (Europe)
```bash
curl "http://localhost:4000/collections?bbox=5.0,47.0,15.0,55.0"
```
Returns collections with spatial extent intersecting central Europe (roughly Germany/Austria area).

### Example 2: Bounding box with other filters
```bash
curl "http://localhost:4000/collections?bbox=-10,35,5,45&q=sentinel&datetime=2020-01-01/.."
```
Returns Sentinel collections from 2020 onwards that intersect with the Iberian Peninsula.

### Example 3: Global bounding box
```bash
curl "http://localhost:4000/collections?bbox=-180,-90,180,90"
```
Returns all collections (no spatial filtering effect).

### Example 4: Anti-meridian crossing (Pacific)
```bash
curl "http://localhost:4000/collections?bbox=170,-10,-170,10"
```
Returns collections intersecting the Pacific region crossing the International Date Line.

### Example 5: With 6 values (altitude ignored)
```bash
curl "http://localhost:4000/collections?bbox=5.0,47.0,0,15.0,55.0,1000"
```
Returns same results as Example 1 (z-values are ignored for 2D spatial filtering).

---

## Validation Rules

The API validates bounding box parameters and returns errors for invalid input:

### Valid Coordinate Ranges
- **Longitude** (`minx`, `maxx`): Must be between -180 and 180
- **Latitude** (`miny`, `maxy`): Must be between -90 and 90

### Valid Coordinate Order
- `miny` must be less than or equal to `maxy`
- `minx` can be greater than `maxx` (anti-meridian crossing case)

### Valid Format
- Must contain exactly 4 or 6 numeric values
- Values must be comma-separated
- All values must be valid numbers (not NaN)

---

## Error Responses

### 400 Bad Request - Invalid Format

**Missing or wrong number of values:**
```json
{
  "error": "Invalid bbox",
  "message": "bbox must contain 4 (or 6) valid numbers"
}
```

**Example:**
```bash
curl "http://localhost:4000/collections?bbox=5.0,47.0,15.0"
# Missing 4th value
```

### 400 Bad Request - Invalid Coordinates

**Out of range coordinates:**
```json
{
  "error": "Invalid bbox coordinates",
  "message": "Longitude must be -180..180 and latitude must be -90..90"
}
```

**Example:**
```bash
curl "http://localhost:4000/collections?bbox=-200,47.0,15.0,55.0"
# minx=-200 is out of range
```

### 400 Bad Request - Invalid Order

**Latitude order violation:**
```json
{
  "error": "Invalid bbox coordinates",
  "message": "miny must be <= maxy"
}
```

**Example:**
```bash
curl "http://localhost:4000/collections?bbox=5.0,55.0,15.0,47.0"
# miny=55.0 > maxy=47.0
```

### 400 Bad Request - Invalid Type

**Non-numeric or invalid format:**
```json
{
  "error": "Invalid bbox format",
  "message": "bbox must be \"minx,miny,maxx,maxy\" (or 6 values) or an array"
}
```

---

## Coordinate System

**EPSG:4326 (WGS84)**
- All coordinates must be provided in WGS84 (latitude/longitude)
- This is the standard coordinate reference system for STAC
- Longitude: -180° (west) to +180° (east)
- Latitude: -90° (south) to +90° (north)

---

## Related Documentation

- [Collections](collections.md) - Main collections endpoint documentation
- [CQL2-text Filtering](cql2-text.md) - Advanced spatial filtering with CQL2
- [Datetime Filtering](datetime.md) - Temporal filtering
- [Queryables](queryables.md) - Available filterable fields
# Sortables Endpoint

## Overview

The `/collections/sortables` endpoint provides a JSON Schema describing all fields that can be used to sort STAC Collections. This follows the OGC API - Features - Part 5: Schemas and allows clients to discover which properties are available for sorting results.

**Endpoint:**
- `GET /collections/sortables` — Returns the schema of sortable fields

---

## GET /collections/sortables

Returns a Sortables object describing all fields available for sorting collections. Only properties of type string, number, or boolean are included. No spatial, object, or array properties are allowed.

### Request

```
GET /collections/sortables
```

### Query Parameters

This endpoint does not accept any query parameters.

### Response

Returns a JSON object conforming to the Sortables specification. The response includes all sortable properties and their types.

**Sortable Properties:**

| Property           | Type    | Description                        | Example Usage         |
|--------------------|---------|------------------------------------|----------------------|
| `title`            | string  | Collection title                   | `sortby=title`       |
| `description`      | string  | Collection description             | `sortby=description` |
| `temporal_start`   | string  | Start of the temporal extent       | `sortby=temporal_start` |
| `temporal_end`     | string  | End of the temporal extent         | `sortby=temporal_end`   |

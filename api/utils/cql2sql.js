// api/utils/cql2sql.js

function astToSql(ast, queryableMap, params) {
  const nextParam = (v) => {
    params.push(v);
    return `$${params.length}`;
  };

  const resolveColumn = (ident) => {
    const q = queryableMap[ident.name];
    if (!q) {
      throw new Error(`Unknown queryable: ${ident.name}`);
    }
    return q;
  };

  const mapCompare = (node) => {
    const q = resolveColumn(node.left);

    // virtual fields
    if (q.type === 'temporal_extent') {
      throw new Error('Use BETWEEN for temporal_extent filtering');
    }

    const col = q.column;
    const op =
      node.op === '!=' || node.op === '<>'
        ? '<>'
        : node.op;


    // LIKE for text and text_array
    if (node.op === 'LIKE') {
      const p = nextParam(String(node.right.value));

      if (q.type === 'text') {
        return `${col} ILIKE ${p}`;
      }

      if (q.type === 'text_array') {
        // match if ANY array element matches the pattern
        return `
          EXISTS (
            SELECT 1
            FROM unnest(${col}) AS kw
            WHERE kw ILIKE ${p}
          )
        `.trim();
      }

      throw new Error(`LIKE not supported for ${node.left.name}`);
    }

    // jsonb_array: match against an object field inside a JSONB array
    // Example: provider = 'ESA'  ->  EXISTS (... providers[*].name = 'ESA')
    if (q.type === 'jsonb_array') {
      const field = q.jsonb_field;
      if (!field) throw new Error(`jsonb_array requires jsonb_field for ${node.left.name}`);

      const p = nextParam(String(node.right.value));
      const jsonArr = `COALESCE(${col}, '[]'::jsonb)`;

      const existsExpr = `
        EXISTS (
          SELECT 1
          FROM jsonb_array_elements(${jsonArr}) AS elem
          WHERE elem->>'${field}' = ${p}
        )
      `.trim();

      if (op === '=') return existsExpr;
      if (op === '<>') return `(NOT ${existsExpr})`;

      throw new Error(`${node.op} not supported for ${node.left.name} (type ${q.type})`);
    }



    // scalar text
    if (q.type === 'text') {
      const p = nextParam(String(node.right.value));
      return `${col} ${op} ${p}`;
    }

    // text_array: treat "=" as "array contains value"
    if (q.type === 'text_array') {
      const p = nextParam(String(node.right.value));

      if (op === '=') {
        // value is contained in array
        return `${p} = ANY(${col})`;
      }

      if (op === '<>') {
        // value is NOT contained in array (also matches NULL arrays)
        return `NOT (${p} = ANY(${col}))`;
      }

      throw new Error(`${node.op} not supported for ${node.left.name} (type ${q.type})`);
    }


    // timestamps
    if (q.type === 'timestamptz') {
      const p = nextParam(String(node.right.value));
      return `${col} ${op} ${p}::timestamptz`;
    }

    // numeric (gsd)
    if (q.type === 'numeric') {
      const value = Number(node.right.value);
      if (Number.isNaN(value)) {
        throw new Error(`Invalid numeric value for ${node.left.name}`);
      }
      const p = nextParam(value);
      return `${col} ${op} ${p}::numeric`;
    }

    throw new Error(`${node.op} not supported for ${node.left.name} (type ${q.type})`);
  };

  const mapIn = (node) => {
    const q = resolveColumn(node.left);

    // virtual fields
    if (q.type === 'temporal_extent') {
      throw new Error('IN not supported for temporal_extent');
    }

    const col = q.column;
    const values = node.values.map(v => v.value);

    // scalar text: col = ANY(text[])
    if (q.type === 'text') {
      const p = nextParam(values.map(String));
      return `${col} = ANY(${p}::text[])`;
    }

    // array column: overlap
    if (q.type === 'text_array') {
      const p = nextParam(values.map(String));
      return `${col} && ${p}::text[]`;
    }

    if (q.type === 'jsonb_array') {
      const field = q.jsonb_field;
      if (!field) throw new Error(`jsonb_array requires jsonb_field for ${node.left.name}`);

      const p = nextParam(values.map(String));
      const jsonArr = `COALESCE(${col}, '[]'::jsonb)`;

      return `
        EXISTS (
          SELECT 1
          FROM jsonb_array_elements(${jsonArr}) AS elem
          WHERE elem->>'${field}' = ANY(${p}::text[])
        )
      `.trim();
    }

    throw new Error(`IN not supported for ${node.left.name} (type ${q.type})`);
  };

  const mapBetween = (node) => {
    const q = resolveColumn(node.left);

    // ---- temporal_extent (virtual) ----
    if (q.type === 'temporal_extent') {
      const low = nextParam(String(node.low.value));
      const high = nextParam(String(node.high.value));

      // overlap: [temporal_start, temporal_end] intersects [low, high]
      return `(temporal_start <= ${high}::timestamptz AND temporal_end >= ${low}::timestamptz)`;
    }

    const col = q.column;

    // timestamp BETWEEN
    if (q.type === 'timestamptz') {
      const p1 = nextParam(String(node.low.value));
      const p2 = nextParam(String(node.high.value));
      return `${col} BETWEEN ${p1}::timestamptz AND ${p2}::timestamptz`;
    }

    throw new Error(`BETWEEN not supported for ${node.left.name} (type ${q.type})`);
  };

  const mapSpatial = (node) => {
    const q = resolveColumn(node.left);
    const col = q.column;

    if (q.type !== 'geometry') {
      throw new Error(`Spatial operator ${node.op} requires geometry field, got ${q.type}`);
    }

    // Parse BBox geometry from right side: { type: "BBox", value: [minX, minY, maxX, maxY] }
    if (!node.right || node.right.type !== 'Literal') {
      throw new Error('Spatial operator requires BBox literal');
    }

    const bbox = node.right.value;
    if (!bbox || typeof bbox !== 'object' || bbox.type !== 'BBox' || !Array.isArray(bbox.value) || bbox.value.length < 4) {
      throw new Error('Invalid BBox format: expected {type: "BBox", value: [minX, minY, maxX, maxY]}');
    }

    const [minX, minY, maxX, maxY] = bbox.value.map(Number);
    if ([minX, minY, maxX, maxY].some(isNaN)) {
      throw new Error('BBox coordinates must be numbers');
    }

    // Create PostGIS envelope for the bounding box
    const bboxParam = nextParam(`POLYGON((${minX} ${minY}, ${maxX} ${minY}, ${maxX} ${maxY}, ${minX} ${maxY}, ${minX} ${minY}))`);
    const geom = `ST_GeomFromText(${bboxParam}, 4326)`;

    // Map CQL2 spatial operators to PostGIS functions
    switch (node.op) {
      case 'S_INTERSECTS':
        return `ST_Intersects(${col}, ${geom})`;
      case 'S_CONTAINS':
        return `ST_Contains(${col}, ${geom})`;
      case 'S_OVERLAPS':
        return `ST_Overlaps(${col}, ${geom})`;
      case 'S_WITHIN':
        return `ST_Within(${col}, ${geom})`;
      default:
        throw new Error(`Unsupported spatial operator: ${node.op}`);
    }
  };

  const walk = (node) => {
    switch (node.type) {
      case 'Logical':
        return `(${walk(node.left)} ${node.op} ${walk(node.right)})`;
      case 'Not':
        return `(NOT ${walk(node.expr)})`;
      case 'Compare':
        return `(${mapCompare(node)})`;
      case 'In':
        return `(${mapIn(node)})`;
      case 'Between':
        return `(${mapBetween(node)})`;
      case 'Spatial':
        return `(${mapSpatial(node)})`;
      default:
        throw new Error(`Unknown AST node: ${node.type}`);
    }
  };

  return walk(ast);
}

module.exports = { astToSql };
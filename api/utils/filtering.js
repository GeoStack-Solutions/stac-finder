// utils/filtering.js
const { parseCql2 } = require('./cql2parser');
const { astToSql } = require('./cql2sql');
const queryableMap = require('./queryableMap');
/**
 * Parse text search query parameter
 * @param {string} q - Search query string
 * @returns {Object} { whereClause, params, error }
 */
const parseTextSearch = (q) => {
    if (!q || typeof q !== 'string') {
        return { whereClause: null, params: [], error: null };
    }
    
    // Trim and validate input
    const searchTerm = q.trim();
    
    if (searchTerm.length === 0) {
        return { whereClause: null, params: [], error: null };
    }
    
    // Validate maximum length (prevent abuse)
    if (searchTerm.length > 200) {
        return {
            whereClause: null,
            params: [],
            error: {
                status: 400,
                error: 'Invalid search query',
                message: 'Search query is too long (maximum 200 characters)'
            }
        };
    }
    
    // Split search terms by whitespace for OR logic
    const searchTerms = searchTerm.split(/\s+/).filter(term => term.length > 0);
    
    if (searchTerms.length === 0) {
        return { whereClause: null, params: [], error: null };
    }
    
    // Build ILIKE search patterns for each term
    const params = [];
    const termConditions = [];
    
    searchTerms.forEach((term, index) => {
        const paramIndex = index + 1;
        const searchPattern = `%${term}%`;
        params.push(searchPattern);
        
        // Each term searches across all fields (OR within fields)
        termConditions.push(`(
            title ILIKE $${paramIndex} 
            OR description ILIKE $${paramIndex} 
            OR license ILIKE $${paramIndex} 
            OR array_to_string(keywords, ' ') ILIKE $${paramIndex}
            OR providers::text ILIKE $${paramIndex}
        )`);
    });
    
    // Combine all term conditions with OR (match any term)
    const whereClause = `(${termConditions.join(' OR ')})`;
    
    return { 
        whereClause, 
        params, 
        error: null 
    };
};

/**
 * Parse bbox filter parameter
 * @param {string|Array} bbox - Bounding box as "minx,miny,maxx,maxy" (or 6 values) or array
 * @returns {Object} { whereClause, params, error }
 */
const parseBboxFilter = (bbox) => {
  if (!bbox) {
    return { whereClause: null, params: [], error: null };
  }

  // Parse bbox string/array to numeric array
  let bboxArray;
  if (typeof bbox === 'string') {
    bboxArray = bbox.split(',').map(v => parseFloat(String(v).trim()));
  } else if (Array.isArray(bbox)) {
    bboxArray = bbox.map(v => parseFloat(String(v).trim()));
  } else {
    return {
      whereClause: null,
      params: [],
      error: {
        status: 400,
        error: 'Invalid bbox format',
        message: 'bbox must be "minx,miny,maxx,maxy" (or 6 values) or an array'
      }
    };
  }

  // STAC allows 4 or 6 values (minx,miny,minz,maxx,maxy,maxz)
  if (
    (bboxArray.length !== 4 && bboxArray.length !== 6) ||
    bboxArray.some(v => Number.isNaN(v))
  ) {
    return {
      whereClause: null,
      params: [],
      error: {
        status: 400,
        error: 'Invalid bbox',
        message: 'bbox must contain 4 (or 6) valid numbers'
      }
    };
  }

  // If 6 values: ignore z (altitude) for 2D spatial filtering
  const minx = bboxArray[0];
  const miny = bboxArray[1];
  const maxx = bboxArray.length === 6 ? bboxArray[3] : bboxArray[2];
  const maxy = bboxArray.length === 6 ? bboxArray[4] : bboxArray[3];

  // Validate lat order
  if (miny > maxy) {
    return {
      whereClause: null,
      params: [],
      error: {
        status: 400,
        error: 'Invalid bbox coordinates',
        message: 'miny must be <= maxy'
      }
    };
  }

  // Validate coordinate ranges (WGS84)
  if (
    minx < -180 || minx > 180 || maxx < -180 || maxx > 180 ||
    miny < -90  || miny > 90  || maxy < -90  || maxy > 90
  ) {
    return {
      whereClause: null,
      params: [],
      error: {
        status: 400,
        error: 'Invalid bbox coordinates',
        message: 'Longitude must be -180..180 and latitude must be -90..90'
      }
    };
  }

  // Normal case: minx <= maxx
  if (minx <= maxx) {
    const params = [minx, miny, maxx, maxy];
    const whereClause = `ST_Intersects(spatial_extent, ST_MakeEnvelope($1, $2, $3, $4, 4326))`;
    return { whereClause, params, error: null };
  }

  // Anti-meridian crossing (minx > maxx): split into two envelopes and OR them
  // Envelope A: [-180, miny, maxx, maxy]
  // Envelope B: [minx,  miny, 180, maxy]
  const params = [-180, miny, maxx, maxy, minx, miny, 180, maxy];
  const whereClause = `(
    ST_Intersects(spatial_extent, ST_MakeEnvelope($1, $2, $3, $4, 4326))
    OR
    ST_Intersects(spatial_extent, ST_MakeEnvelope($5, $6, $7, $8, 4326))
  )`;

  return { whereClause, params, error: null };
};


/**
 * Parse datetime filter parameter (STAC-conformant)
 * Supports ISO8601 intervals and temporal operations (BEFORE, AFTER, DURING)
 * 
 * @param {string} datetime - Datetime as single timestamp or interval
 * 
 * Supported formats:
 * - Single timestamp: "2020-01-01T00:00:00Z" (exact match or contains)
 * - Closed interval: "2020-01-01T00:00:00Z/2020-12-31T23:59:59Z" (DURING)
 * - Open start: "../2020-12-31T23:59:59Z" (BEFORE or ends before)
 * - Open end: "2020-01-01T00:00:00Z/.." (AFTER or starts after)
 * - Fully open: "../.." (any temporal extent)
 * 
 * @returns {Object} { whereClause, params, error }
 */
const parseDatetimeFilter = (datetime) => {
    if (!datetime) {
        return { whereClause: null, params: [], error: null };
    }
    
    // Validate datetime is a string
    if (typeof datetime !== 'string') {
        return {
            whereClause: null,
            params: [],
            error: {
                status: 400,
                error: 'Invalid datetime format',
                message: 'datetime must be a string'
            }
        };
    }
    
    const trimmed = datetime.trim();
    
    // Handle fully open interval (matches any temporal extent)
    if (trimmed === '../..' || trimmed === '') {
        return { whereClause: null, params: [], error: null };
    }
    
    // Check if it's an interval (contains '/')
    if (trimmed.includes('/')) {
        const parts = trimmed.split('/');
        
        if (parts.length !== 2) {
            return {
                whereClause: null,
                params: [],
                error: {
                    status: 400,
                    error: 'Invalid datetime interval',
                    message: 'datetime interval must have format: start/end'
                }
            };
        }
        
        const [startStr, endStr] = parts;
        
        // Parse start and end timestamps
        const hasStart = startStr !== '..';
        const hasEnd = endStr !== '..';
        
        let startDate = null;
        let endDate = null;
        
        if (hasStart) {
            startDate = new Date(startStr);
            if (isNaN(startDate.getTime())) {
                return {
                    whereClause: null,
                    params: [],
                    error: {
                        status: 400,
                        error: 'Invalid datetime',
                        message: `Invalid start datetime: ${startStr}`
                    }
                };
            }
        }
        
        if (hasEnd) {
            endDate = new Date(endStr);
            if (isNaN(endDate.getTime())) {
                return {
                    whereClause: null,
                    params: [],
                    error: {
                        status: 400,
                        error: 'Invalid datetime',
                        message: `Invalid end datetime: ${endStr}`
                    }
                };
            }
        }
        
        // Validate that start < end if both are present
        if (hasStart && hasEnd && startDate >= endDate) {
            return {
                whereClause: null,
                params: [],
                error: {
                    status: 400,
                    error: 'Invalid datetime interval',
                    message: 'Start datetime must be before end datetime'
                }
            };
        }
        
        // Build WHERE clause based on interval type
        const conditions = [];
        const params = [];
        
        if (hasStart && hasEnd) {
            // DURING: Collection temporal extent overlaps with query interval
            // Overlap condition: collection_start <= query_end AND (collection_end >= query_start OR collection_end IS NULL)
            params.push(endStr, startStr);
            conditions.push(`(temporal_start <= $${params.length - 1} AND (temporal_end >= $${params.length} OR temporal_end IS NULL))`);
        } else if (hasStart && !hasEnd) {
            // AFTER: Collection starts on or after the given time (open end)
            // Or: Collection temporal extent intersects with [start, infinity)
            params.push(startStr);
            conditions.push(`(temporal_end >= $${params.length} OR temporal_end IS NULL)`);
        } else if (!hasStart && hasEnd) {
            // BEFORE: Collection ends on or before the given time (open start)
            // Or: Collection temporal extent intersects with (-infinity, end]
            params.push(endStr);
            conditions.push(`(temporal_start <= $${params.length})`);
        }
        
        const whereClause = conditions.length > 0 ? conditions.join(' AND ') : null;
        return { whereClause, params, error: null };
        
    } else {
        // Single timestamp: find collections that contain this timestamp
        // Collection contains timestamp if: temporal_start <= timestamp <= temporal_end
        const timestamp = new Date(trimmed);
        
        if (isNaN(timestamp.getTime())) {
            return {
                whereClause: null,
                params: [],
                error: {
                    status: 400,
                    error: 'Invalid datetime',
                    message: `Invalid datetime: ${trimmed}`
                }
            };
        }
        
        const params = [trimmed, trimmed];
        const whereClause = `(temporal_start <= $1 AND (temporal_end >= $2 OR temporal_end IS NULL))`;
        
        return { whereClause, params, error: null };
    }
};

const looksLikeJson = (s) => typeof s === 'string' && /^[\s]*[{[]/.test(s);

const cql2JsonToAst = (node) => {
  // literals
  if (node === null || typeof node === 'string' || typeof node === 'number') {
    return { type: 'Literal', value: node };
  }

  // BBox geometry: { type: "BBox", value: [...] }
  if (node && typeof node === 'object' && node.type === 'BBox' && Array.isArray(node.value)) {
    return { type: 'Literal', value: node };
  }

  // property reference: { property: "title" }
  if (node && typeof node === 'object' && !Array.isArray(node) && node.property) {
    return { type: 'Identifier', name: node.property };
  }

  // operation node: { op: "...", args: [...] }
  if (node && typeof node === 'object' && node.op) {
    const op = String(node.op).toUpperCase();
    const args = node.args || [];

    // NOT
    if (op === 'NOT') {
      if (args.length !== 1) throw new Error('NOT requires 1 arg');
      return { type: 'Not', expr: cql2JsonToAst(args[0]) };
    }

    // AND/OR (CQL2 JSON is usually n-ary; our AST is binary → fold it)
    if (op === 'AND' || op === 'OR') {
      if (args.length < 2) throw new Error(`${op} requires at least 2 args`);
      return args.slice(1).reduce((left, right) => {
        return { type: 'Logical', op, left, right: cql2JsonToAst(right) };
      }, cql2JsonToAst(args[0]));
    }

    // BETWEEN: args: [ {property}, low, high ]
    if (op === 'BETWEEN') {
      if (args.length !== 3) throw new Error('BETWEEN requires 3 args');
      return {
        type: 'Between',
        left: cql2JsonToAst(args[0]),
        low: cql2JsonToAst(args[1]),
        high: cql2JsonToAst(args[2]),
      };
    }

    // IN: args commonly [ {property}, [v1,v2,...] ]  (sometimes list is directly multiple args)
    if (op === 'IN') {
      if (args.length < 2) throw new Error('IN requires args');
      const left = cql2JsonToAst(args[0]);
      const list = Array.isArray(args[1]) ? args[1] : args.slice(1);
      return {
        type: 'In',
        left,
        values: list.map(v => cql2JsonToAst(v)),
      };
    }

    // LIKE and comparisons: args: [ {property}, literal ]
    const compareOps = ['=', '!=', '<', '>', 'LIKE'];
    if (compareOps.includes(op)) {
      if (args.length !== 2) throw new Error(`${op} requires 2 args`);
      return {
        type: 'Compare',
        op,
        left: cql2JsonToAst(args[0]),
        right: cql2JsonToAst(args[1]),
      };
    }

    // Spatial operators: s_intersects, s_contains, s_overlaps, s_within
    const spatialOps = ['S_INTERSECTS', 'S_CONTAINS', 'S_OVERLAPS', 'S_WITHIN'];
    if (spatialOps.includes(op)) {
      if (args.length !== 2) throw new Error(`${op} requires 2 args`);
      return {
        type: 'Spatial',
        op,
        left: cql2JsonToAst(args[0]),
        right: cql2JsonToAst(args[1]),
      };
    }

    throw new Error(`Unsupported CQL2 JSON op: ${node.op}`);
  }

  throw new Error('Invalid CQL2 JSON filter');
};

const parseCql2Filter = (filter, filterLang, queryParams) => {
    if (!filter) {
      return { whereClause: null, params: [], error: null };
    }
  
    const validLangs = ['cql2-text', 'cql2-json'];
    let lang = filterLang;
  
    // default if not provided
    if (!lang) {
      lang = looksLikeJson(filter) ? 'cql2-json' : 'cql2-text';
    }
  
    if (!validLangs.includes(lang)) {
      return {
        whereClause: null,
        params: [],
        error: {
          status: 400,
          error: 'Invalid filter-lang',
          message: `filter-lang must be one of: ${validLangs.join(', ')}`
        }
      };
    }
  
    try {
      let ast;
  
      if (lang === 'cql2-text') {
        if (typeof filter !== 'string') {
          return {
            whereClause: null,
            params: [],
            error: { status: 400, error: 'Invalid CQL2 filter', message: 'filter must be a string for cql2-text' }
          };
        }
        ast = parseCql2(filter);
      } else {
        // cql2-json (in query string typically arrives as JSON string)
        const obj = typeof filter === 'string' ? JSON.parse(filter) : filter;
        ast = cql2JsonToAst(obj);
      }
  
      // IMPORTANT: use the shared queryParams so placeholders match
      const whereClause = astToSql(ast, queryableMap, queryParams);
      return { whereClause, params: [], error: null };
  
    } catch (e) {
      return {
        whereClause: null,
        params: [],
        error: { status: 400, error: 'Invalid CQL2 filter', message: e.message }
      };
    }
  };

module.exports = {
    parseTextSearch,
    parseBboxFilter,
    parseDatetimeFilter,
    parseCql2Filter
};
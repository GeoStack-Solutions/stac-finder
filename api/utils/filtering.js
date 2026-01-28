// utils/filtering.js
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

const parseCql2Filter = (filter, filterLang) => {
    // TODO: Implement CQL2 filtering using queryBuilder.js
    // Validate filter-lang parameter (cql2-text, cql2-json)
    // Return parsed filter for queryBuilder
    if (!filter) {
        return { whereClause: null, params: [], error: null };
    }
    
    // Validate filter-lang
    const validLangs = ['cql2-text', 'cql2-json'];
    if (filterLang && !validLangs.includes(filterLang)) {
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
    
    // TODO: Call queryBuilder.cql2ToSql(filter, filterLang)
    return { whereClause: null, params: [], error: null };
};

module.exports = {
    parseTextSearch,
    parseBboxFilter,
    parseDatetimeFilter,
    parseCql2Filter
};
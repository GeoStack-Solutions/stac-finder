const db = require('../db');
const { parseSortby } = require('../utils/sorting');
const { parsePaginationParams, createPaginationLinks } = require('../utils/pagination');
const { parseTextSearch, parseDatetimeFilter, parseBboxFilter } = require('../utils/filtering');

const { parseCql2 } = require('../utils/cql2parser');
const { astToSql } = require('../utils/cql2sql');
const queryableMap = require('../utils/queryableMap');

const getCollections = async (req, res) => {
  try {
    let sql =
      'SELECT id, title, description, keywords, license, temporal_start, temporal_end, providers, ' +
      'ST_AsGeoJSON(spatial_extent)::json as spatial_extent ' +
      'FROM test.collections';

    const queryParams = [];
    const whereParts = [];

    // --- Text search (q=...) ---
    const { whereClause: searchWhere, params: searchParams, error: searchError } = parseTextSearch(req.query.q);
    if (searchError) {
      return res.status(searchError.status).json({
        error: searchError.error,
        message: searchError.message
      });
    }
    if (searchWhere) {
      whereParts.push(`(${searchWhere})`);
      queryParams.push(...searchParams);
    }

    // --- CQL2 filter (filter=...) ---
    if (req.query.filter) {
      try {
        const ast = parseCql2(req.query.filter);
        const cqlWhere = astToSql(ast, queryableMap, queryParams); // appends params into queryParams
        whereParts.push(`(${cqlWhere})`);
      } catch (e) {
        return res.status(400).json({
          error: 'Invalid CQL2 filter',
          message: e.message
        });
      }
    }

      // --- Datetime filter (datetime=...) ---
      const { whereClause: datetimeWhere, params: datetimeParams, error: datetimeError } = parseDatetimeFilter(req.query.datetime);
      if (datetimeError) {
          return res.status(datetimeError.status).json({
              error: datetimeError.error,
              message: datetimeError.message
          });
      }

      if (datetimeWhere) {
          // Adjust parameter placeholders based on existing parameters
          const adjustedWhere = datetimeWhere.replace(/\$(\d+)/g, (match, num) => {
              return `$${queryParams.length + parseInt(num, 10)}`;
          });
          whereParts.push(`(${adjustedWhere})`);
          queryParams.push(...datetimeParams);
      }

      // --- BBox filter (bbox=...) ---
      const { whereClause: bboxWhere, params: bboxParams, error: bboxError } = parseBboxFilter(req.query.bbox);
      if (bboxError) {
          return res.status(bboxError.status).json({
              error: bboxError.error,
              message: bboxError.message
          });
      }

      if (bboxWhere) {
          const adjustedWhere = bboxWhere.replace(/\$(\d+)/g, (match, num) => {
              return `$${queryParams.length + parseInt(num, 10)}`;
          });
          whereParts.push(`(${adjustedWhere})`);
          queryParams.push(...bboxParams);
      }



    // Apply WHERE if any
    if (whereParts.length > 0) {
      sql += ` WHERE ${whereParts.join(' AND ')}`;
    }

    // --- Sorting ---
    const allowedColumns = ['id', 'title', 'description', 'license'];
    const { orderByClauses, error: sortError } = parseSortby(req.query.sortby, allowedColumns);
    if (sortError) {
      return res.status(sortError.status).json({
        error: sortError.error,
        message: sortError.message
      });
    }
    if (orderByClauses.length > 0) {
      sql += ` ORDER BY ${orderByClauses.join(', ')}`;
    }

    // --- Pagination ---
    const { limit, offset, error: paginationError } = parsePaginationParams(req.query);
    if (paginationError) {
      return res.status(paginationError.status).json({
        error: paginationError.error,
        message: paginationError.message
      });
    }
    
    // Fetch one extra item to check if there are more results
    const fetchLimit = limit + 1;
    sql += ` LIMIT ${fetchLimit} OFFSET ${offset}`;

    const result = await db.query(sql, queryParams);

    // Check if there are more results than requested
    const hasMoreResults = result.rows.length > limit;
    
    // Only return the requested number of items (not the extra one)
    const rowsToReturn = hasMoreResults ? result.rows.slice(0, limit) : result.rows;

    const collections = rowsToReturn.map((row) => {
      let bbox = null;
      if (row.spatial_extent && row.spatial_extent.coordinates) {
        const coords = row.spatial_extent.coordinates[0];
        if (coords && coords.length > 0) {
          const lons = coords.map(c => c[0]);
          const lats = coords.map(c => c[1]);
          bbox = [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
        }
      }

      return {
        id: row.id.toString(),
        title: row.title,
        description: row.description,
        extent: {
          spatial: { bbox: bbox ? [bbox] : [] },
          temporal: { interval: [[row.temporal_start, row.temporal_end]] }
        },
        license: row.license,
        keywords: row.keywords,
        providers: row.providers?.map((name) => ({ name })),
        links: [{ rel: 'self', href: `/collections/${row.id}`, type: 'application/json' }]
      };
    });

    const links = createPaginationLinks('/collections', req.query, offset, limit, collections.length, hasMoreResults);

    return res.json({ collections, links });

  } catch (err) {
    console.error('Error fetching collections: ', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
   
const getCollectionById = async (req, res) => {
    const { id } = req.params;

    try {
        // Extend the query to extract BBox coordinates directly from the geometry
        const query = `
            SELECT *, 
                   ST_XMin(spatial_extent) as xmin, 
                   ST_YMin(spatial_extent) as ymin, 
                   ST_XMax(spatial_extent) as xmax, 
                   ST_YMax(spatial_extent) as ymax 
            FROM test.collections 
            WHERE id = $1
        `;

        const result = await db.query(query, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'Collection not found',
                message: `No collection with id "${id}" found`
            });
        }

        const row = result.rows[0]; 

        const collection = {
            stac_version: '1.0.0',
            type: 'Collection',
            id: row.id.toString(),
            title: row.title,
            description: row.description,
            extent: {
                spatial: {
                    // Compose BBox from the calculated coordinates
                    bbox: [[row.xmin, row.ymin, row.xmax, row.ymax]]
                },
                temporal: {
                    interval: [[row.temporal_start, row.temporal_end]]
                }
            },
            license: row.license,
            keywords: row.keywords,
            providers: row.providers?.map(name => ({ name })),
            
            summaries: {
                doi: row.doi,
                platform: row.platform_summary,
                constellation: row.constellation_summary,
                gsd: row.gsd_summary,
                'processing:level': row.processing_level_summary
            },

            links: [
                {
                    rel: 'self',
                    href: `/collections/${row.id}`,
                    type: 'application/json'
                },
                {
                    rel: 'root',
                    href: '/',
                    type: 'application/json'
                },
                {
                    rel: 'parent',
                    href: '/collections',
                    type: 'application/json'
                }
            ]
        };

        
        res.json(collection);

    } catch (err) {
        console.error('Error fetching collection by id: ', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { getCollections, getCollectionById };
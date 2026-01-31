const db = require('../db');
const { parseSortby } = require('../utils/sorting');
const { parsePaginationParams, createPaginationLinks } = require('../utils/pagination');
const { parseTextSearch, parseDatetimeFilter, parseBboxFilter, parseCql2Filter } = require('../utils/filtering');

const { parseCql2 } = require('../utils/cql2parser');
const { astToSql } = require('../utils/cql2sql');
const queryableMap = require('../utils/queryableMap');

const getCollections = async (req, res) => {
  try {
    let sql =
      'SELECT c.id, c.title, c.description, c.keywords, c.license, ' +
      'c.temporal_start, c.temporal_end, c.providers, ' +
      'c.doi, c.platform_summary, c.constellation_summary, c.gsd_summary, c.processing_level_summary, ' + 
      '(SELECT url FROM stac.sources WHERE id = c.source_id) AS source_url, ' +
      'ST_AsGeoJSON(c.spatial_extent)::json as spatial_extent ' +
      'FROM stac.collections c';

    // For numberMatched: build a separate COUNT(*) query with the same WHERE conditions
    let countSql = 'SELECT COUNT(*) FROM stac.collections c';

    const queryParams = [];
    const whereParts = [];

    const baseUrl = `${req.protocol}://${req.get('host')}`;

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
    const { whereClause: cqlWhere, error: cqlError } = parseCql2Filter(
  req.query.filter,
  req.query['filter-lang'],
  queryParams,
  queryableMap
);

    
    if (cqlError) {
      return res.status(cqlError.status).json({ error: cqlError.error, message: cqlError.message });
    }

    if (cqlWhere) {
      whereParts.push(`(${cqlWhere})`);
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
      const whereClause = ` WHERE ${whereParts.join(' AND ')}`;
      sql += whereClause;
      countSql += whereClause;
    }

    // --- Sorting ---
    const allowedColumns = ['id', 'title', 'description', 'license', 'temporal_start', 'temporal_end'];
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

    // Execute the COUNT query to determine numberMatched
    const countResult = await db.query(countSql, queryParams);
    const numberMatched = parseInt(countResult.rows[0].count, 10);

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

      // Build summaries only with non-empty arrays or valid values
      const summaries = {};
      if (row.doi) {
        const val = Array.isArray(row.doi) ? row.doi : [row.doi];
        if (val.length > 0 && val[0] != null && val[0] !== '') summaries.doi = val;
      }
      if (row.platform_summary) {
        const val = Array.isArray(row.platform_summary) ? row.platform_summary : [row.platform_summary];
        if (val.length > 0 && val[0] != null && val[0] !== '') summaries.platform = val;
      }
      if (row.constellation_summary) {
        const val = Array.isArray(row.constellation_summary) ? row.constellation_summary : [row.constellation_summary];
        if (val.length > 0 && val[0] != null && val[0] !== '') summaries.constellation = val;
      }
      if (row.gsd_summary) {
        const val = Array.isArray(row.gsd_summary) ? row.gsd_summary : [row.gsd_summary];
        if (val.length > 0 && val[0] != null && val[0] !== '') summaries.gsd = val;
      }
      if (row.processing_level_summary) {
        const val = Array.isArray(row.processing_level_summary) ? row.processing_level_summary : [row.processing_level_summary];
        if (val.length > 0 && val[0] != null && val[0] !== '') summaries['processing:level'] = val;
      }

      return {
        stac_version: '1.0.0',
        type: 'Collection',
        id: row.id.toString(),
        title: row.title,
        description: row.description,
        extent: {
          spatial: { bbox: bbox ? [bbox] : [] },
          temporal: { interval: [[row.temporal_start, row.temporal_end]] }
        },
        license: row.license,
        keywords: row.keywords,
        providers: row.providers && Array.isArray(row.providers) ? row.providers : [],
        ...(Object.keys(summaries).length > 0 ? { summaries } : {}),
        links: [
          { rel: 'self', 
            href: `${baseUrl}/collections/${row.id}`, 
            type: 'application/json' ,
            title: 'This document'
          },
          ...(row.source_url
            ? [{ rel: 'via', 
              href: row.source_url, 
              type: 'text/html',
              title: 'Source url' }]
            : [])
        ]
      };
    });

    // Pass numberMatched in the query object so 'last' link can be generated
    const links = createPaginationLinks(
      `${baseUrl}/collections`,
      { ...req.query },
      offset,
      limit,
      collections.length,
      hasMoreResults,
      numberMatched
    );

    // add querybales link
    links.push({
      rel: "http://www.opengis.net/def/rel/ogc/1.0/queryables",
      href: `${baseUrl}/collections/queryables`,
      type: "application/schema+json",
      title: "Queryables for collection search"
    });

    // add sortables link
    links.push({
      rel: "http://www.opengis.net/def/rel/ogc/1.0/sortables",
      href: `${baseUrl}/collections/sortables`,
      type: "application/schema+json",
      title: "Sortables for collection search"
    });

    // numberReturned: number of collections actually returned
    const numberReturned = collections.length;
    return res.json({ collections, links, numberReturned, numberMatched });

  } catch (err) {
    console.error('Error fetching collections: ', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getCollectionById = async (req, res) => {
  const { id } = req.params;
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  try {
    const query = `
      SELECT 
        c.*,
        s.url AS source_url,
        ST_XMin(c.spatial_extent) as xmin, 
        ST_YMin(c.spatial_extent) as ymin, 
        ST_XMax(c.spatial_extent) as xmax, 
        ST_YMax(c.spatial_extent) as ymax 
      FROM stac.collections c
      LEFT JOIN stac.sources s ON c.source_id = s.id
      WHERE c.id = $1
    `;

    const result = await db.query(query, [id]);



    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Collection not found',
        message: `No collection with id "${id}" found`
      });
    }

    const row = result.rows[0];

    // Build summaries only with non-empty arrays or valid values
    const summaries = {};
    if (row.doi) {
      const val = Array.isArray(row.doi) ? row.doi : [row.doi];
      if (val.length > 0 && val[0] != null && val[0] !== '') summaries.doi = val;
    }
    if (row.platform_summary) {
      const val = Array.isArray(row.platform_summary) ? row.platform_summary : [row.platform_summary];
      if (val.length > 0 && val[0] != null && val[0] !== '') summaries.platform = val;
    }
    if (row.constellation_summary) {
      const val = Array.isArray(row.constellation_summary) ? row.constellation_summary : [row.constellation_summary];
      if (val.length > 0 && val[0] != null && val[0] !== '') summaries.constellation = val;
    }
    if (row.gsd_summary) {
      const val = Array.isArray(row.gsd_summary) ? row.gsd_summary : [row.gsd_summary];
      if (val.length > 0 && val[0] != null && val[0] !== '') summaries.gsd = val;
    }
    if (row.processing_level_summary) {
      const val = Array.isArray(row.processing_level_summary) ? row.processing_level_summary : [row.processing_level_summary];
      if (val.length > 0 && val[0] != null && val[0] !== '') summaries['processing:level'] = val;
    }

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
      providers: row.providers && Array.isArray(row.providers) ? row.providers : [],
      ...(Object.keys(summaries).length > 0 ? { summaries } : {}),
      links: [
        {
          rel: 'self',
          href: `${baseUrl}/collections/${row.id}`,
          type: 'application/json'
        },
        {
          rel: 'root',
          href: `${baseUrl}`,
          type: 'application/json',
          title: 'STACFinder API'
        },
        {
          rel: 'parent',
          href: `${baseUrl}`,
          type: 'application/json',
          title: 'STACFinder API'
        },
        {
          rel: 'http://www.opengis.net/def/rel/ogc/1.0/queryables',
          type: 'application/schema+json',
          href: `${baseUrl}/collections/queryables`,
          title: "Queryables for collection search"
        },
        {
          rel: "http://www.opengis.net/def/rel/ogc/1.0/sortables",
          type: "application/schema+json",
          href: `${baseUrl}/collections/sortables`,
          title: "Sortables for collection search"
        },
        ...(row.source_url
          ? [{ rel: 'via', 
               href: row.source_url, 
               type: 'text/html',
               title: 'Source url' }]
          : [])
      ]
    };


    res.json(collection);

  } catch (err) {
    console.error('Error fetching collection by id: ', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getCollections, getCollectionById };
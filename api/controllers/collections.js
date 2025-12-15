// TEMPORARY: Set to false when database is ready, then delete these 4 lines
const USE_MOCK = true;
const mockDb = require('../db/mockData');
const realDb = require('../db');
const db = USE_MOCK ? mockDb : realDb; 
// After deletion add: const db = require('../db');

const { parseSortby } = require('../utils/sorting');
const { parsePaginationParams, createPaginationLinks } = require('../utils/pagination');

const getCollections = async (req, res) => {
    try {
        let sql = 'SELECT id, title, description, keywords, license, temporal_start, temporal_end, providers, ST_AsGeoJSON(spatial_extent)::json as spatial_extent FROM stac.collections';
        
        // Whitelist of allowed columns to prevent SQL injection
        const allowedColumns = ['id', 'title', 'description', 'license'];

        // Parse and validate sorting
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

        // Parse and validate pagination
        const { limit, offset, error: paginationError } = parsePaginationParams(req.query);
        if (paginationError) {
            return res.status(paginationError.status).json({
                error: paginationError.error,
                message: paginationError.message
            });
        }
        
        // Add LIMIT and OFFSET to query
        sql += ` LIMIT ${limit} OFFSET ${offset}`;

        const result = await db.query(sql);

        const collections = result.rows.map((row) => {
            // Extract bbox from spatial_extent GeoJSON
            let bbox = null;
            if (row.spatial_extent && row.spatial_extent.coordinates) {
                // For Polygon: coordinates[0] contains the outer ring
                const coords = row.spatial_extent.coordinates[0];
                if (coords && coords.length > 0) {
                    const lons = coords.map(c => c[0]);
                    const lats = coords.map(c => c[1]);
                    bbox = [
                        Math.min(...lons),
                        Math.min(...lats),
                        Math.max(...lons),
                        Math.max(...lats)
                    ];
                }
            }

            return {
                id: row.id.toString(),
                title: row.title,
                description: row.description,
                extent: {
                    spatial: {
                        bbox: bbox ? [bbox] : []
                    },
                    temporal: {
                        interval: [[row.temporal_start, row.temporal_end]]
                    }
                },
                license: row.license,
                keywords: row.keywords,
                providers: row.providers?.map((name) => ({ name })),
                links: [
                    {
                        rel: 'self',
                        href: `/collections/${row.id}`,
                        type: 'application/json'
                    }
                ]
            };
        });

        // Build pagination links
        const links = createPaginationLinks(
            '/collections',
            req.query,
            offset,
            limit,
            collections.length
        );

        const data = {
            collections,
            links
        };
        
        // return json
        res.json(data);
        
    } catch (err) {
        console.error('Error fetching collections: ', err);
        res.status(500).json({error: 'Internal server error'});
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
            FROM stac.collections 
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
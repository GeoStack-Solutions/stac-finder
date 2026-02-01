
const db = require('../db');
const path = require('path');
const { logger } = require('../middleware/logger');

const getQueryables = async (req, res, next) => {
    try {
        res.type('application/schema+json');

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const pathNoQuery = req.originalUrl.split('?')[0];
        const schemaId = `${baseUrl}${pathNoQuery}`;

        // Get all data to fill enums
        const licenseResult = await db.query('SELECT DISTINCT license FROM stac.collections WHERE license IS NOT NULL ORDER BY license');
        const licenseEnum = licenseResult.rows.map(row => row.license).filter(Boolean);

        const platformResult = await db.query('SELECT DISTINCT UNNEST(platform_summary) AS platform FROM stac.collections WHERE platform_summary IS NOT NULL ORDER BY platform');
        const platformEnum = platformResult.rows.map(row => row.platform).filter(Boolean);

        const processingLevelResult = await db.query('SELECT DISTINCT UNNEST(processing_level_summary) AS processing_level FROM stac.collections WHERE processing_level_summary IS NOT NULL ORDER BY processing_level');
        const processingLevelEnum = processingLevelResult.rows.map(row => row.processing_level).filter(Boolean);
        
        const constellationResult = await db.query('SELECT DISTINCT UNNEST(constellation_summary) AS constellation FROM stac.collections WHERE constellation_summary IS NOT NULL ORDER BY constellation');
        const constellationEnum = constellationResult.rows.map(row => row.constellation).filter(Boolean);

        const gsdResult = await db.query('SELECT DISTINCT jsonb_array_elements_text(gsd_summary) AS gsd FROM stac.collections WHERE gsd_summary IS NOT NULL');
        const gsdEnum = gsdResult.rows
            .map(row => Number(row.gsd))
            .filter(val => !isNaN(val))
            .sort((a, b) => a - b);

        const providerResult = await db.query(`SELECT DISTINCT provider->>'name' AS provider FROM stac.collections, LATERAL jsonb_array_elements(providers) AS provider WHERE providers IS NOT NULL ORDER BY provider`);
        const providerEnum = providerResult.rows.map(row => row.provider).filter(Boolean);

        const queryables = {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            $id: schemaId,

            title: 'Collections Queryables',
            description:
                'JSON Schema describing the properties that can be used in filter expressions for /collections.',

            type: 'object',
            additionalProperties: false,

            properties: {
                title: {
                    type: 'string',
                    title: 'Title',
                    description: 'Collection title'
                },
                description: {
                    type: 'string',
                    title: 'Description',
                    description: 'Collection description'
                },
                license: {
                    type: 'string',
                    title: 'License',
                    description: 'License string (e.g. CC-BY-4.0)',
                    enum: licenseEnum,
                    'x-ogc-queryable-operators': ['eq', 'neq']
                },
                doi: {
                    type: 'string',
                    title: 'DOI',
                    description: 'Digital Object Identifier'
                },
                temporal_start: {
                    type: 'string',
                    format: 'date-time',
                    title: 'Temporal start',
                    description: 'Start of the temporal extent'
                },
                temporal_end: {
                    type: 'string',
                    format: 'date-time',
                    title: 'Temporal end',
                    description: 'End of the temporal extent (may be null/open-ended)'
                },
                spatial_extent: {
                    title: 'Spatial extent',
                    description: 'Geometry used for spatial filtering',
                    'x-ogc-role': 'primary-geometry',
                    format: 'geometry-any'
                },
                platform: {
                    description: "Unique name of the specific platform to which the instrument is attached",
                    title: "Platform",
                    type: "string",
                    enum: platformEnum,
                    'x-ogc-queryable-operators': ['eq', 'neq']
                },
                processingLevel: {
                    description: "Processing level of the data (e.g., L1, L2, L3)",
                    title: "Processing level",
                    type: "string",
                    enum: processingLevelEnum,
                    'x-ogc-queryable-operators': ['eq', 'neq']
                },
                constellation: {
                    description: "Name of the constellation to which the platform belongs",
                    title: "Constellation",
                    type: "string",
                    enum: constellationEnum,
                    'x-ogc-queryable-operators': ['eq', 'neq']
                },
                gsd: {
                    description: "Ground Sample Distance in meters",
                    title: "GSD",
                    type: "number",
                    enum: gsdEnum,
                    'x-ogc-queryable-operators': ['eq', 'neq', 'lt', 'lte', 'gt', 'gte']
                },
                provider: {
                    description: 'Name of the organization or individual that provides the data',
                    type: 'string',
                    title: 'Provider',
                    enum: providerEnum,
                    'x-ogc-queryable-operators': ['eq', 'neq']
                },
                keywords: {
                    description: 'Keywords or tags describing the collection',
                    type: 'string',
                    title: 'Keyword'
                }
            }
        };

        return res.json(queryables);
    } catch (err) {
        logger.error('Error fetching queryables', { error: err.message, stack: err.stack });
        return next(err);
    }
};

module.exports = { getQueryables };


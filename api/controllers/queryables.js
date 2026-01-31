
const db = require('../db');
const path = require('path');

const getQueryables = async (req, res) => {
    try {
        res.type('application/schema+json');

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const pathNoQuery = req.originalUrl.split('?')[0];
        const schemaId = `${baseUrl}${pathNoQuery}`;

        // Get all data to fill enums
        const licenseResult = await db.query('SELECT DISTINCT license FROM test.collections WHERE license IS NOT NULL ORDER BY license');
        const licenseEnum = licenseResult.rows.map(row => row.license).filter(Boolean);

        const platformResult = await db.query('SELECT DISTINCT UNNEST(platform_summary) AS platform FROM test.collections WHERE platform_summary IS NOT NULL ORDER BY platform');
        const platformEnum = platformResult.rows.map(row => row.platform).filter(Boolean);

        const processingLevelResult = await db.query('SELECT DISTINCT UNNEST(processing_level_summary) AS processing_level FROM test.collections WHERE processing_level_summary IS NOT NULL ORDER BY processing_level');
        const processingLevelEnum = processingLevelResult.rows.map(row => row.processing_level).filter(Boolean);
        
        const constellationResult = await db.query('SELECT DISTINCT UNNEST(constellation_summary) AS constellation FROM test.collections WHERE constellation_summary IS NOT NULL ORDER BY constellation');
        const constellationEnum = constellationResult.rows.map(row => row.constellation).filter(Boolean);

        const gsdResult = await db.query('SELECT DISTINCT jsonb_array_elements_text(gsd_summary) AS gsd FROM test.collections WHERE gsd_summary IS NOT NULL');
        const gsdEnum = gsdResult.rows
            .map(row => Number(row.gsd))
            .filter(val => !isNaN(val))
            .sort((a, b) => a - b);

        const providerResult = await db.query(`SELECT DISTINCT provider->>'name' AS provider FROM test.collections, LATERAL jsonb_array_elements(providers) AS provider WHERE providers IS NOT NULL ORDER BY provider`);
        const providerEnum = providerResult.rows.map(row => row.provider).filter(Boolean);

        const keywordsResult = await db.query('SELECT DISTINCT UNNEST(keywords) AS keyword FROM test.collections WHERE keywords IS NOT NULL ORDER BY keyword');
        const keywordsEnum = keywordsResult.rows.map(row => row.keyword).filter(Boolean);

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
                    enum: licenseEnum
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
                    description: "{eo:platform}",
                    title: "Platform",
                    type: "string",
                    enum: platformEnum
                },
                processingLevel: {
                    description: "{eo:processingLevel}",
                    title: "Processing level",
                    type: "string",
                    enum: processingLevelEnum
                },
                constellation: {
                    description: "{eo:constellation}",
                    title: "Constellation",
                    type: "string",
                    enum: constellationEnum
                },
                gsd: {
                    description: "{eo:gsd}",
                    title: "GSD",
                    type: "number",
                    enum: gsdEnum
                },
                provider: {
                    description: '{eo:providerName}',
                    type: 'string',
                    title: 'Provider',
                    enum: providerEnum
                },
                keywords: {
                    description: '{eo:keywords}',
                    type: 'string',
                    title: 'Keyword',
                    enum: keywordsEnum
                }
            }
        };

        return res.json(queryables);
    } catch (err) {
        console.error('Error fetching queryables: ', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { getQueryables };


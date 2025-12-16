import { normalizeCollection } from './migrator.js';

/**
 * Processes the crawled JSON and prepares the database object.
 * * @param {Object} rawJson - The raw crawled JSON.
 * @param {string} sourceUrl - The URL of the collection.
 * @param {number} sourceId - The ID of the source from the 'sources' table.
 * @returns {Promise<Object|null>} The object ready for DB insertion, or null on error.
 */
export async function prepareForDatabase(rawJson, sourceUrl, sourceId) {
    
    // Step 1: Migration / Normalization
    let cleanData;
    try {
        cleanData = await normalizeCollection(rawJson, sourceUrl);
    } catch (error) {
    
        return null; 
    }

    const { collection, stacVersion } = cleanData;

    // Helper function to safely access deeply nested properties
    const getDeep = (obj, path) => path.split('.').reduce((acc, part) => acc && acc[part], obj);

    // Step 2: Mapping to the Database Schema
    const dbEntry = {
        // Primary Key and Identification
        id: collection.id,
        
        // IMPORTANT: Storing the STAC version
        stac_version: stacVersion,
        
        // IMPORTANT: Storing the full migrated JSON content
        full_content: collection, 
        
        // Source Information 
        fk_source_id: sourceId,
        source_url: sourceUrl,
        last_crawled_timestamp: new Date().toISOString(),

        // Metadata Extraction
        title: collection.title || null,
        description: collection.description || null,
        keywords: collection.keywords || [],
        license: collection.license || null,
        
        // Geometries for PostGIS (spatial) and Intervals (temporal)
        spatial_extent: getDeep(collection, 'extent.spatial.bbox'),
        temporal_extent: getDeep(collection, 'extent.temporal.interval'),

        // Additional Summaries (Providers, Platforms, etc.)
        platforms: getDeep(collection, 'summaries.platform') || [],
        constellations: getDeep(collection, 'summaries.constellation') || []
    };

    return dbEntry;
}
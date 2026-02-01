/**
 * Parses a STAC Collection JSON and extracts key metadata.
 * @param {Object} json - The raw JSON object of a Collection
 * @param {string} sourceId - ID of the source 
 * @param {string} crawledAt - Timestamp of the crawl
 * @returns {Object|null} A normalized object or null if type is not 'Collection'.
 */
export function parseCollection(json, sourceId, crawledAt) {

    // Validate input type
    if (!json || json.type !== 'Collection') {
        return null;
    }

    // Helper: Normalize single values to arrays 
    const toArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

    // Extract nested fields safely
    const bboxArray = json.extent?.spatial?.bbox?.[0];
    const timeInterval = json.extent?.temporal?.interval?.[0];
    const summaries = json.summaries || {};

    // Replace slashes with underscores in the ID
    let safeId = json.id;
    if (typeof safeId === 'string') {
        safeId = safeId.replace(/\//g, '_');
    }

    // Replace spaces with hyphen in the license
    let safeLicense = json.license;
    if (typeof safeLicense === 'string') {
        safeLicense = safeLicense.replace(/ /g, '-');
    }
    
    // Return the structured metadata object
    return {
        // Basic fields
        id: safeId,
        title: json.title || safeId,
        description: json.description || null,

        // Source info 
        source_id: sourceId || null,
        last_crawled_timestamp: crawledAt || null,

        // Extents
        bbox: bboxArray || null,
        temporal_start: timeInterval?.[0] || null,
        temporal_end: timeInterval?.[1] || null,

        // Search Fields
        keywords: json.keywords || [],
        providers: toArray(json.providers),
        license: safeLicense || null,
        doi: json['sci:doi'] || json.doi || null,

        // Summaries
        platform: toArray(summaries.platform),
        constellation: toArray(summaries.constellation),
        gsd: toArray(summaries.gsd),
        processing_level: toArray(summaries['processing:level']),

        // STAC Extensions
        stac_extensions: normalizeStacExtensions(json.stac_extensions),

        // Archiving 
        raw_json: structuredClone(json)
    };
}

// Normalize STAC extension URLs to their base names
function normalizeStacExtensions(extensions = []) {
    if (!extensions || !Array.isArray(extensions)) return [];
    return extensions.map(url => {
        try {
            const match = url.match(/\/([a-z0-9-_]+)\/v\d+\./);
            return match ? match[1] : null; 
        } catch (e) { return null; }
    }).filter(e => e !== null);
}

/**
 * Parse pagination parameters from query
 * @param {Object} query - Request query object
 * @param {number} defaultLimit - Default limit value
 * @param {number} maxLimit - Maximum allowed limit value
 * @returns {Object} { limit: number, offset: number, error: Object|null }
 */
const parsePaginationParams = (query, defaultLimit = 10, maxLimit = 10000) => {
    const token = query.token;
    
    // Parse limit - only use default if not provided at all
    let limit = defaultLimit;
    if (query.limit !== undefined) {
        limit = parseInt(query.limit);
        
        // Validate limit only if it was provided
        if (isNaN(limit) || limit < 1) {
            return {
                limit: defaultLimit,
                offset: 0,
                error: {
                    status: 400,
                    error: 'Invalid limit parameter',
                    message: 'limit must be a positive integer'
                }
            };
        }
    }

    // Cap limit at maximum
    const effectiveLimit = Math.min(limit, maxLimit);

    // Decode token to get offset
    let offset = 0;
    if (token) {
        try {
            const decoded = Buffer.from(token, 'base64').toString('utf-8');
            const tokenData = JSON.parse(decoded);
            offset = tokenData.offset || 0;
        } catch (err) {
            return {
                limit: effectiveLimit,
                offset: 0,
                error: {
                    status: 400,
                    error: 'Invalid token parameter',
                    message: 'token is malformed or invalid'
                }
            };
        }
    }

    return { limit: effectiveLimit, offset, error: null };
};

/**
 * Create pagination token
 * @param {number} offset - Offset value to encode
 * @returns {string} Base64-encoded token
 */
const createPaginationToken = (offset) => {
    return Buffer.from(JSON.stringify({ offset })).toString('base64');
};

/**
 * Build query string from params object
 * @param {Object} params - Query parameters object
 * @returns {string} Query string with leading '?' or empty string
 */
const buildQueryString = (params) => {
    const queryParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, value);
        }
    }
    const queryString = queryParams.toString();
    return queryString ? `?${queryString}` : '';
};

/**
 * Create pagination links for STAC response
 * @param {string} baseUrl - Base URL for the endpoint (e.g., '/collections')
 * @param {Object} query - Original query parameters
 * @param {number} offset - Current offset
 * @param {number} limit - Current limit
 * @param {number} resultCount - Number of results returned 
 * @param {boolean} hasMoreResults - Whether there are more results available (determined by LIMIT+1 check)
 * @returns {Array} Array of link objects
 */
const createPaginationLinks = (baseUrl, query, offset, limit, resultCount, hasMoreResults = null) => {
    const links = [
        {
            rel: 'self',
            href: `${baseUrl}${buildQueryString(query)}`,
            type: 'application/json'
        }
    ];

    // Determine if there are more results
    const shouldShowNext = hasMoreResults !== null 
        ? hasMoreResults 
        : resultCount === limit;

    // Add 'next' link if there are definitely more results
    if (shouldShowNext) {
        const nextOffset = offset + limit;
        const nextToken = createPaginationToken(nextOffset);
        const nextQuery = { ...query, token: nextToken, limit };
        links.push({
            rel: 'next',
            href: `${baseUrl}${buildQueryString(nextQuery)}`,
            type: 'application/json'
        });
    }

    // Add 'prev' link if we're not on the first page
    if (offset > 0) {
        const prevOffset = Math.max(0, offset - limit);
        const prevToken = createPaginationToken(prevOffset);
        const prevQuery = { ...query, token: prevToken, limit };
        links.push({
            rel: 'prev',
            href: `${baseUrl}${buildQueryString(prevQuery)}`,
            type: 'application/json'
        });
    }

    return links;
};

module.exports = {
    parsePaginationParams,
    createPaginationToken,
    buildQueryString,
    createPaginationLinks
};

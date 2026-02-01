const { logger } = require('../middleware/logger');

const getConformance = async (req, res, next) => {
    try {
        const conformance = {
            conformsTo: [
                'https://api.stacspec.org/v1.0.0/core',
                'https://api.stacspec.org/v1.0.0/collections',
                'https://api.stacspec.org/v1.0.0/collection-search',
                'http://www.opengis.net/spec/ogcapi-common-2/1.0/conf/simple-query',
                'https://api.stacspec.org/v1.0.0-rc.1/collection-search#free-text',
                'https://api.stacspec.org/v1.0.0-rc.1/collection-search#filter',
                'https://api.stacspec.org/v1.1.0/collection-search#sort',
                'http://www.opengis.net/spec/cql2/1.0/conf/basic-cql2',
                'https://api.stacspec.org/v1.0.0/collection-search#fields',
                'http://www.opengis.net/spec/cql2/1.0/conf/cql2-text',
                'http://www.opengis.net/spec/cql2/1.0/conf/cql2-json',
                'http://www.opengis.net/spec/cql2/1.0/conf/basic-spatial-functions',
                'http://www.opengis.net/spec/cql2/1.0/conf/spatial-functions',
                'http://www.opengis.net/spec/cql2/1.0/conf/advanced-comparison-operators',
                'http://www.opengis.net/spec/cql2/1.0/conf/temporal-functions',
                'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/collections',
                'http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core',
                'https://api.stacspec.org/v1.1.0/collection-search#sortables'
            ]
        };

        res.json(conformance);
    } catch (err) {
        logger.error('Error fetching conformance', { error: err.message, stack: err.stack });
        return next(err);
    }
};

module.exports = { getConformance };

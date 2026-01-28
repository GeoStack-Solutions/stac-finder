const getConformance = async (req, res) => {
    try {
        const conformance = {
            conformsTo: [
                'https://api.stacspec.org/v1.0.0/core',
                'https://api.stacspec.org/v1.0.0/collections',
                'http://www.opengis.net/spec/ogcapi-common-2/1.0/conf/simple-query',
                'https://api.stacspec.org/v1.0.0-rc.1/collection-search#free-text',
                'https://api.stacspec.org/v1.0.0-rc.1/collection-search#filter',
                'https://api.stacspec.org/v1.1.0/collection-search#sort',
                'http://www.opengis.net/spec/cql2/1.0/conf/cql2-text',
                'http://www.opengis.net/spec/cql2/1.0/conf/cql2-json',
                'http://www.opengis.net/spec/cql2/1.0/conf/basic-spatial-functions'
            ]
        };

        res.json(conformance);
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to generate conformance declaration'
        });
    }
};

module.exports = { getConformance };

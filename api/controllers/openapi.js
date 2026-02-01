const fs = require('fs');
const path = require('path');
const { logger } = require('../middleware/logger');

const getOpenAPI = async (req, res, next) => {
    try {
        const openapiPath = path.join(__dirname, '../../docs/api/openapi.json');
        
        // Check if file exists
        if (!fs.existsSync(openapiPath)) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'OpenAPI specification not available'
            });
        }

        // Read and parse the OpenAPI file
        const openapiContent = fs.readFileSync(openapiPath, 'utf8');
        
        // Return empty object if file is empty
        if (!openapiContent.trim()) {
            return res.status(404).json({
                error: 'Not Found',
                message: 'OpenAPI specification not yet defined'
            });
        }

        const openapi = JSON.parse(openapiContent);
        
        // Set appropriate content type
        res.setHeader('Content-Type', 'application/vnd.oai.openapi+json;version=3.0');
        res.json(openapi);
    } catch (err) {
        logger.error('Error loading OpenAPI specification', { error: err.message, stack: err.stack });
        return next(err);
    }
};

module.exports = { getOpenAPI };

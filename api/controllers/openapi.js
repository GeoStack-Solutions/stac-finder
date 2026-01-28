const fs = require('fs');
const path = require('path');

const getOpenAPI = async (req, res) => {
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
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to load OpenAPI specification'
        });
    }
};

module.exports = { getOpenAPI };

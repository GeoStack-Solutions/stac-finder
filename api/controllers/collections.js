const db = require('../db');
const path = require('path');

const getCollections = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM stac.collections ORDER BY title');

        const collections = result.rows.map((row) => ({
            id: row.id.toString(),
            title: row.title,
            description: row.description,
            extend: {
                spatial: {
                    bbox: [row.bbox]
                },
                temporal: {
                    interval: [[row.temporal_start, row.temporal_end]]
                }
            },
            license: row.license,
            keywords: row.keywords,
            providers: row.provider_names?.map((name) => ({ name })),
            links: [
                {
                    rel: 'self',
                    href: `/collections/${row.id}`,
                    type: 'application/json'
                }
            ]
        }));

        const data = {
            collections,
            links: [
                {
                    rel: 'self',
                    href: '/collections',
                    type: 'application/json'
                }
            ]
        };

        // Content Negotiation: Query Parameter + Accept Header
        const format = req.query.f;
        const acceptHeader = req.get('Accept') || '';
        
        // Validate format-paramter (when given)
        if (format && format !== 'json' && format !== 'html') {
            return res.status(400).json({
                error: 'Invalid format parameter',
                message: 'Format must be either "json" or "html"'
            });
        }
        
        // Check explicit format parameters first, then Accept header
        if (format === 'html' || (!format && acceptHeader.includes('text/html'))) {
            return res.sendFile(path.join(__dirname, '../../web-ui/collections.html'));
        }
        
        // Default: JSON for API-Clients
        res.json(data);
        
    } catch (err) {
        console.error('Error fetching collections: ', err);
        res.status(500).json({error: 'Internal server error'});
    }
};

module.exports = { getCollections };
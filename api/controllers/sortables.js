const getSortables = async (req, res) => {
    try {
        res.type('application/schema+json');

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const pathNoQuery = req.originalUrl.split('?')[0];
        const schemaId = `${baseUrl}${pathNoQuery}`;


        const sortablesSchema = {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            $id: schemaId,

            title: 'Collections Sortables',
            description:
                'JSON Schema describing the properties that can be used in sort expressions for /collections.',

            type: 'object',
            additionalProperties: false,

            properties: {
                title: { 
                    type: "string", 
                    title: "Title",
                    description: "Collection title" 
                },
                description: {
                    type: 'string',
                    title: 'Description',
                    description: 'Collection description'
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
                }
            }     
        };

        res.json(sortablesSchema);
    } catch (error) {
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'Failed to generate sortables'
        });
    }
};

module.exports = { getSortables };

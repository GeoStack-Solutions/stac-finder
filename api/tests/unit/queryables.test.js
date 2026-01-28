const { getQueryables } = require('../../controllers/queryables');

describe('Queryables Controller', () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    mockReq = {};
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  describe('getQueryables', () => {
    test('should return queryables object with correct type', async () => {
      await getQueryables(mockReq, mockRes);
      
      expect(mockRes.json).toHaveBeenCalled();
      const response = mockRes.json.mock.calls[0][0];
      expect(response.type).toBe('Queryables');
    });

    test('should include title and description', async () => {
      await getQueryables(mockReq, mockRes);
      
      const response = mockRes.json.mock.calls[0][0];
      expect(response.title).toBeDefined();
      expect(response.description).toBeDefined();
    });

    test('should include all required queryable properties', async () => {
      await getQueryables(mockReq, mockRes);
      
      const response = mockRes.json.mock.calls[0][0];
      const properties = response.properties;

      expect(properties).toBeDefined();
      expect(properties.title).toBeDefined();
      expect(properties.description).toBeDefined();
      expect(properties.keywords).toBeDefined();
      expect(properties.license).toBeDefined();
      expect(properties.platform_summary).toBeDefined();
      expect(properties.constellation_summary).toBeDefined();
      expect(properties.gsd_summary).toBeDefined();
      expect(properties.processing_level_summary).toBeDefined();
      expect(properties.spatial_extent).toBeDefined();
      expect(properties.temporal_extent).toBeDefined();
    });

    test('should have correct type for string properties', async () => {
      await getQueryables(mockReq, mockRes);
      
      const response = mockRes.json.mock.calls[0][0];
      const properties = response.properties;

      expect(properties.title.type).toBe('string');
      expect(properties.description.type).toBe('string');
      expect(properties.license.type).toBe('string');
    });

    test('should have correct type for array properties', async () => {
      await getQueryables(mockReq, mockRes);
      
      const response = mockRes.json.mock.calls[0][0];
      const properties = response.properties;

      expect(properties.keywords.type).toBe('array');
      expect(properties.platform_summary.type).toBe('array');
      expect(properties.constellation_summary.type).toBe('array');
      expect(properties.gsd_summary.type).toBe('array');
      expect(properties.processing_level_summary.type).toBe('array');
      expect(properties.temporal_extent.type).toBe('array');
    });

    test('should have correct structure for spatial_extent', async () => {
      await getQueryables(mockReq, mockRes);
      
      const response = mockRes.json.mock.calls[0][0];
      const spatialExtent = response.properties.spatial_extent;

      expect(spatialExtent.type).toBe('object');
      expect(spatialExtent.properties).toBeDefined();
      expect(spatialExtent.properties.type).toBeDefined();
      expect(spatialExtent.properties.coordinates).toBeDefined();
    });

    test('should have correct structure for temporal_extent', async () => {
      await getQueryables(mockReq, mockRes);
      
      const response = mockRes.json.mock.calls[0][0];
      const temporalExtent = response.properties.temporal_extent;

      expect(temporalExtent.type).toBe('array');
      expect(temporalExtent.items.type).toBe('string');
      expect(temporalExtent.items.format).toBe('date-time');
      expect(temporalExtent.minItems).toBe(2);
      expect(temporalExtent.maxItems).toBe(2);
    });

    test('each property should have title and description', async () => {
      await getQueryables(mockReq, mockRes);
      
      const response = mockRes.json.mock.calls[0][0];
      const properties = response.properties;

      Object.keys(properties).forEach(key => {
        expect(properties[key].title).toBeDefined();
        expect(properties[key].description).toBeDefined();
      });
    });
  });
});

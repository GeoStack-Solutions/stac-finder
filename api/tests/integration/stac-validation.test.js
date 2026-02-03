const request = require('supertest');
const app = require('../../app');
const db = require('../../db');
const validateSTAC = require('stac-node-validator');

describe('STAC Validation', () => {
  let baseUrl;
  let server;
  let collectionIds;

  beforeAll(async () => {
    // Start server and get base URL
    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;

    // Get collection IDs from database
    const result = await db.query('SELECT id FROM stac.collections WHERE license = \'CC-BY-4.0\' LIMIT 50');
    collectionIds = result.rows.map(row => row.id);
  });

  afterAll(async () => {
    // Close server
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    
    // Close database pool
    await db.pool.end();
    
    // Give time for connections to close
    await new Promise(resolve => setTimeout(resolve, 200));
  });

  describe('Landing Page', () => {
    test('should validate / against STAC specification', async () => {
      const url = `${baseUrl}/`;
      const report = await validateSTAC(url);
      
      expect(report.valid).toBe(true);
      
      if (!report.valid) {
        console.log('Validation errors for /:', JSON.stringify(report, null, 2));
      }
    }, 10000);
  });

  describe('Collections Endpoint', () => {
    test('should validate /collections against STAC specification', async () => {
      const url = `${baseUrl}/collections?filter=license='CC-BY-4.0'`;
      const report = await validateSTAC(url);
      
      expect(report.valid).toBe(true);
      
      if (!report.valid) {
        console.log('Validation errors for /collections:', JSON.stringify(report, null, 2));
      }
    }, 15000);

    test('should validate /collections with limit parameter', async () => {
      const url = `${baseUrl}/collections?limit=5&filter=license='CC-BY-4.0'`;
      const report = await validateSTAC(url);
      
      expect(report.valid).toBe(true);
      
      if (!report.valid) {
        console.log('Validation errors for /collections?limit=5:', JSON.stringify(report, null, 2));
      }
    }, 15000);

    test('should validate /collections with sortby parameter', async () => {
      const url = `${baseUrl}/collections?sortby=title&filter=license='CC-BY-4.0'`;
      const report = await validateSTAC(url);
      
      expect(report.valid).toBe(true);
      
      if (!report.valid) {
        console.log('Validation errors for /collections?sortby=title:', JSON.stringify(report, null, 2));
      }
    }, 15000);

    test('should validate /collections with bbox parameter', async () => {
      const url = `${baseUrl}/collections?bbox=5.0,47.0,15.0,55.0&filter=license='CC-BY-4.0'`;
      const report = await validateSTAC(url);
      
      expect(report.valid).toBe(true);
      
      if (!report.valid) {
        console.log('Validation errors for /collections?bbox=...:', JSON.stringify(report, null, 2));
      }
    }, 15000);

    test('should validate /collections with datetime parameter', async () => {
      const url = `${baseUrl}/collections?datetime=2020-01-01/..&filter=license='CC-BY-4.0'`;
      const report = await validateSTAC(url);
      
      expect(report.valid).toBe(true);
      
      if (!report.valid) {
        console.log('Validation errors for /collections?datetime=...:', JSON.stringify(report, null, 2));
      }
    }, 15000);

    test('should validate /collections with combined parameters', async () => {
      const url = `${baseUrl}/collections?limit=10&sortby=-title&bbox=5.0,47.0,15.0,55.0&filter=license='CC-BY-4.0'`;
      const report = await validateSTAC(url);
      
      expect(report.valid).toBe(true);
      
      if (!report.valid) {
        console.log('Validation errors for /collections with combined params:', JSON.stringify(report, null, 2));
      }
    }, 15000);
  });

  describe('Individual Collections', () => {
    test('should have collection IDs from database', () => {
      expect(collectionIds).toBeDefined();
      expect(collectionIds.length).toBeGreaterThan(0);
    });

    test('should validate first 100 collections against STAC specification', async () => {
      expect(collectionIds).toBeDefined();
      expect(collectionIds.length).toBeGreaterThan(0);

      const failedCollections = [];
      
      for (const collectionId of collectionIds) {
        const url = `${baseUrl}/collections/${collectionId}`;
        
        const report = await validateSTAC(url);
        
        if (!report.valid) {
          failedCollections.push({
            id: collectionId,
            errors: report.results.core
          });
        }
      }

      // Log failed collections for debugging
      if (failedCollections.length > 0) {
        console.log(`Failed collections (${failedCollections.length}/${collectionIds.length}):`);
        failedCollections.forEach(fc => {
          console.log(`  - ${fc.id}: ${JSON.stringify(fc.errors)}`);
        });
      }

      expect(failedCollections.length).toBe(0);
    }, 120000); // 2 minutes timeout for 50 collections
  });
});


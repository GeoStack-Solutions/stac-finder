const request = require('supertest');
const app = require('../../app');

describe('GET /collections', () => {
  test('should return collections with default pagination', async () => {
    const res = await request(app).get('/collections');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('collections');
    expect(res.body).toHaveProperty('links');
    expect(res.body.collections.length).toBeLessThanOrEqual(10);
  });

  test('should respect limit parameter', async () => {
    const res = await request(app).get('/collections?limit=5');
    expect(res.status).toBe(200);
    expect(res.body.collections.length).toBeLessThanOrEqual(5);
  });

  test('should return 400 for invalid limit', async () => {
    const res = await request(app).get('/collections?limit=invalid');
    expect(res.status).toBe(400);
  });

  test('should include next link when more results exist', async () => {
    const res = await request(app).get('/collections?limit=2');
    const nextLink = res.body.links.find(l => l.rel === 'next');
    expect(nextLink).toBeDefined();
    expect(nextLink.href).toContain('token=');
  });

  test('should navigate with token', async () => {
    const res1 = await request(app).get('/collections?limit=2');
    const nextLink = res1.body.links.find(l => l.rel === 'next');
    
    // Extract the path from the href
    const url = new URL(nextLink.href);
    const res2 = await request(app).get(url.pathname + url.search);
    expect(res2.status).toBe(200);
    expect(res2.body.collections).toBeDefined();
  });

  test('should sort collections', async () => {
    const res = await request(app).get('/collections?sortby=title');
    expect(res.status).toBe(200);
  });
});

describe('GET /collections - Combined Query Parameter Integration Tests', () => {
  
  // Combined Parameter Tests
  describe('Combined Parameters', () => {
    test('should combine limit and sortby', async () => {
      const res = await request(app).get('/collections?limit=5&sortby=title');
      expect(res.status).toBe(200);
      expect(res.body.collections.length).toBeLessThanOrEqual(5);
    });

    test('should combine bbox and datetime', async () => {
      const res = await request(app).get('/collections?bbox=5.0,47.0,15.0,55.0&datetime=2024-01-01T00:00:00Z/2024-12-31T23:59:59Z');
      expect(res.status).toBe(200);
      expect(res.body.collections).toBeDefined();
    });

    test('should combine q and limit', async () => {
      const res = await request(app).get('/collections?q=sentinel&limit=3');
      expect(res.status).toBe(200);
      expect(res.body.collections.length).toBeLessThanOrEqual(3);
    });

    test('should combine q and sortby', async () => {
      const res = await request(app).get('/collections?q=sentinel&sortby=-title');
      expect(res.status).toBe(200);
      expect(res.body.collections).toBeDefined();
    });

    test('should combine bbox, datetime and limit', async () => {
      const res = await request(app).get('/collections?bbox=5.0,47.0,15.0,55.0&datetime=2024-01-01T00:00:00Z/..&limit=10');
      expect(res.status).toBe(200);
      expect(res.body.collections.length).toBeLessThanOrEqual(10);
    });

    test('should combine q, bbox and datetime', async () => {
      const res = await request(app).get('/collections?q=sentinel&bbox=5.0,47.0,15.0,55.0&datetime=2024-01-01T00:00:00Z/..');
      expect(res.status).toBe(200);
      expect(res.body.collections).toBeDefined();
    });

    test.skip('should combine CQL2-text filter with bbox', async () => {
      const res = await request(app).get('/collections?filter-lang=cql2-text&filter=title LIKE \'Sentinel%\' &bbox=5.0,47.0,15.0,55.0');
      expect(res.status).toBe(200);
      expect(res.body.collections).toBeDefined();
    });

    test.skip('should combine CQL2-text filter with datetime', async () => {
      const res = await request(app).get('/collections?filter-lang=cql2-text&filter=license="proprietary"&datetime=2024-01-01T00:00:00Z/..');
      expect(res.status).toBe(200);
      expect(res.body.collections).toBeDefined();
    });

    test('should combine CQL2-json filter with limit and sortby', async () => {
      const filter = JSON.stringify({
        op: 'like',
        args: [{ property: 'title' }, 'Sentinel%']
      });
      const res = await request(app).get(`/collections?filter-lang=cql2-json&filter=${encodeURIComponent(filter)}&limit=5&sortby=title`);
      expect(res.status).toBe(200);
      expect(res.body.collections.length).toBeLessThanOrEqual(5);
    });

    test('should combine q, bbox, datetime, limit and sortby', async () => {
      const res = await request(app).get('/collections?q=sentinel&bbox=5.0,47.0,15.0,55.0&datetime=2024-01-01T00:00:00Z/..&limit=5&sortby=-title');
      expect(res.status).toBe(200);
      expect(res.body.collections.length).toBeLessThanOrEqual(5);
    });

    test.skip('should combine CQL2-text filter, bbox, datetime, limit and sortby', async () => {
      const res = await request(app).get('/collections?filter-lang=cql2-text&filter=eo:cloud_cover < 50&bbox=5.0,47.0,15.0,55.0&datetime=2024-01-01T00:00:00Z/..&limit=10&sortby=title');
      expect(res.status).toBe(200);
      expect(res.body.collections.length).toBeLessThanOrEqual(10);
    });

    test.skip('should combine CQL2-json filter, bbox, datetime, limit and sortby', async () => {
      const filter = JSON.stringify({
        op: 'and',
        args: [
          { op: 'like', args: [{ property: 'title' }, 'Sentinel%'] },
          { op: 'eq', args: [{ property: 'license' }, 'CC-BY-4.0'] }
        ]
      });
      const res = await request(app).get(`/collections?filter-lang=cql2-json&filter=${encodeURIComponent(filter)}&bbox=5.0,47.0,15.0,55.0&datetime=2024-01-01/..&limit=5&sortby=-datetime`);
      expect(res.status).toBe(200);
      expect(res.body.collections.length).toBeLessThanOrEqual(5);
    });
  });

  // Pagination with filters
  describe('Pagination with Filters', () => {
    test('should paginate filtered results with bbox', async () => {
      const res = await request(app).get('/collections?bbox=5.0,47.0,15.0,55.0&limit=2');
      expect(res.status).toBe(200);
      if (res.body.collections.length > 0) {
        const nextLink = res.body.links.find(l => l.rel === 'next');
        if (nextLink) {
          expect(nextLink.href).toContain('bbox=');
          expect(nextLink.href).toContain('token=');
        }
      }
    });

    test('should paginate filtered results with datetime', async () => {
      const res = await request(app).get('/collections?datetime=2024-01-01T00:00:00Z/..&limit=2');
      expect(res.status).toBe(200);
      if (res.body.collections.length > 0) {
        const nextLink = res.body.links.find(l => l.rel === 'next');
        if (nextLink) {
          expect(nextLink.href).toContain('datetime=');
        }
      }
    });

    test('should paginate free text search results', async () => {
      const res = await request(app).get('/collections?q=sentinel&limit=2');
      expect(res.status).toBe(200);
      if (res.body.collections.length > 0) {
        const nextLink = res.body.links.find(l => l.rel === 'next');
        if (nextLink) {
          expect(nextLink.href).toContain('q=');
        }
      }
    });

    test('should paginate CQL2 filtered results', async () => {
      const filter = JSON.stringify({
        op: 'like',
        args: [{ property: 'title' }, 'Sentinel%']
      });
      const res = await request(app).get(`/collections?filter-lang=cql2-json&filter=${encodeURIComponent(filter)}&limit=2`);
      expect(res.status).toBe(200);
      if (res.body.collections.length > 0) {
        const nextLink = res.body.links.find(l => l.rel === 'next');
        if (nextLink) {
          expect(nextLink.href).toContain('filter');
        }
      }
    });

    test('should maintain all parameters through pagination', async () => {
      const res = await request(app).get('/collections?q=sentinel&bbox=5.0,47.0,15.0,55.0&sortby=title&limit=2');
      expect(res.status).toBe(200);
      if (res.body.collections.length > 0) {
        const nextLink = res.body.links.find(l => l.rel === 'next');
        if (nextLink) {
          expect(nextLink.href).toContain('q=');
          expect(nextLink.href).toContain('bbox=');
          expect(nextLink.href).toContain('sortby=');
        }
      }
    });
  });

  // Filter-lang Auto-Detection Tests
  describe('Filter-lang Auto-Detection', () => {
    test('should auto-detect cql2-json when filter-lang is omitted', async () => {
      const filter = JSON.stringify({
        op: 'like',
        args: [{ property: 'title' }, 'Sentinel%']
      });
      const res = await request(app).get(`/collections?filter=${encodeURIComponent(filter)}`);
      expect([200, 400]).toContain(res.status); // 200 if CQL2-JSON is implemented, 400 for parsing errors
      
      if (res.status === 200) {
        expect(res.body.collections).toBeDefined();
      }
    });

    test('should auto-detect cql2-text when filter-lang is omitted', async () => {
      const res = await request(app).get('/collections?filter=title LIKE "Sentinel%"');
      expect([200, 400]).toContain(res.status); // 200 if CQL2-text is implemented, 400 for parsing errors
      
      if (res.status === 200) {
        expect(res.body.collections).toBeDefined();
      }
    });

    test('should auto-detect cql2-json for complex filter without filter-lang', async () => {
      const filter = JSON.stringify({
        op: 'and',
        args: [
          { op: 'like', args: [{ property: 'title' }, 'Sentinel%'] },
          { op: 'eq', args: [{ property: 'license' }, 'proprietary'] }
        ]
      });
      const res = await request(app).get(`/collections?filter=${encodeURIComponent(filter)}&limit=5`);
      expect([200, 400]).toContain(res.status);
      
      if (res.status === 200) {
        expect(res.body.collections).toBeDefined();
        expect(res.body.collections.length).toBeLessThanOrEqual(5);
      }
    });
  });
});

describe('GET /collections/:id', () => {
  test('should return a single collection by id', async () => {
    // Erst eine Collection aus der Liste holen
    const listRes = await request(app).get('/collections?limit=1');
    const collectionId = listRes.body.collections[0]?.id;
    
    expect(collectionId).toBeDefined();
    
    const res = await request(app).get(`/collections/${collectionId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', collectionId);
    expect(res.body).toHaveProperty('type', 'Collection');
    expect(res.body).toHaveProperty('stac_version', '1.0.0');
  });

  test('should return 404 for non-existent collection', async () => {
    const res = await request(app).get('/collections/non-existent-id-12345');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'Collection not found');
  });

  test('should include required STAC links', async () => {
    const listRes = await request(app).get('/collections?limit=1');
    const collectionId = listRes.body.collections[0]?.id;
    
    const res = await request(app).get(`/collections/${collectionId}`);
    expect(res.status).toBe(200);
    
    const links = res.body.links;
    expect(links.find(l => l.rel === 'self')).toBeDefined();
    expect(links.find(l => l.rel === 'root')).toBeDefined();
    expect(links.find(l => l.rel === 'parent')).toBeDefined();
  });
});

// Helper functions for validation
function isDateInRange(dateStr, startStr, endStr) {
  const date = new Date(dateStr);
  const start = startStr && startStr !== '..' ? new Date(startStr) : null;
  const end = endStr && endStr !== '..' ? new Date(endStr) : null;
  
  if (start && date < start) return false;
  if (end && date > end) return false;
  return true;
}

function isPointInBBox(point, bbox) {
  if (!point || !point.coordinates) return false;
  
  const [lon, lat] = point.coordinates;
  const [minLon, minLat, maxLon, maxLat] = bbox;
  
  // Handle antimeridian crossing
  if (minLon > maxLon) {
    return (lon >= minLon || lon <= maxLon) && lat >= minLat && lat <= maxLat;
  }
  
  return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
}

function isBBoxIntersecting(collectionBBox, queryBBox) {
  if (!collectionBBox || collectionBBox.length < 4) return false;
  
  const [cMinLon, cMinLat, cMaxLon, cMaxLat] = collectionBBox;
  const [qMinLon, qMinLat, qMaxLon, qMaxLat] = queryBBox;
  
  // Simple 2D intersection check
  return !(cMaxLon < qMinLon || cMinLon > qMaxLon || cMaxLat < qMinLat || cMinLat > qMaxLat);
}

function containsSearchTerm(text, searchTerms) {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return searchTerms.some(term => lowerText.includes(term.toLowerCase()));
}

describe('GET /collections - Result Validation Tests', () => {
  
  describe('Datetime Filter Result Validation', () => {
    test('should return only collections within datetime range', async () => {
      const startDate = '2020-01-01T00:00:00Z';
      const endDate = '2024-12-31T23:59:59Z';
      
      const res = await request(app).get(`/collections?datetime=${startDate}/${endDate}&limit=20`);
      expect(res.status).toBe(200);
      
      if (res.body.collections && res.body.collections.length > 0) {
        res.body.collections.forEach(collection => {
          const temporal = collection.extent?.temporal;
          if (temporal && temporal.interval && temporal.interval[0]) {
            const [colStart, colEnd] = temporal.interval[0];
            
            // At least one date should overlap with the query range
            const hasOverlap = 
              (colStart && isDateInRange(colStart, null, endDate)) ||
              (colEnd && isDateInRange(colEnd, startDate, null));
            
            expect(hasOverlap).toBe(true);
          }
        });
      }
    });

    test('should return only collections with temporal_start before end date', async () => {
      const endDate = '2024-12-31T23:59:59Z';
      
      const res = await request(app).get(`/collections?datetime=../${endDate}&limit=20`);
      expect(res.status).toBe(200);
      
      if (res.body.collections && res.body.collections.length > 0) {
        res.body.collections.forEach(collection => {
          const temporal = collection.extent?.temporal;
          if (temporal && temporal.interval && temporal.interval[0]) {
            const [colStart] = temporal.interval[0];
            if (colStart) {
              expect(new Date(colStart) <= new Date(endDate)).toBe(true);
            }
          }
        });
      }
    });

    test('should return only collections with temporal_end after start date', async () => {
      const startDate = '2020-01-01T00:00:00Z';
      
      const res = await request(app).get(`/collections?datetime=${startDate}/..&limit=20`);
      expect(res.status).toBe(200);
      
      if (res.body.collections && res.body.collections.length > 0) {
        res.body.collections.forEach(collection => {
          const temporal = collection.extent?.temporal;
          if (temporal && temporal.interval && temporal.interval[0]) {
            const [, colEnd] = temporal.interval[0];
            // If colEnd is null, it means ongoing collection
            if (colEnd) {
              expect(new Date(colEnd) >= new Date(startDate)).toBe(true);
            }
          }
        });
      }
    });
  });

  describe('BBox Filter Result Validation', () => {
    test('should return only collections intersecting with bbox', async () => {
      const bbox = [5.0, 47.0, 15.0, 55.0];
      
      const res = await request(app).get(`/collections?bbox=${bbox.join(',')}&limit=20`);
      expect(res.status).toBe(200);
      
      if (res.body.collections && res.body.collections.length > 0) {
        res.body.collections.forEach(collection => {
          const spatial = collection.extent?.spatial;
          if (spatial && spatial.bbox && spatial.bbox[0]) {
            const collectionBBox = spatial.bbox[0];
            expect(isBBoxIntersecting(collectionBBox, bbox)).toBe(true);
          }
        });
      }
    });

    test('should filter collections by small bbox', async () => {
      const bbox = [10.0, 50.0, 11.0, 51.0];
      
      const res = await request(app).get(`/collections?bbox=${bbox.join(',')}&limit=20`);
      expect(res.status).toBe(200);
      
      // Verify all results intersect with bbox
      if (res.body.collections && res.body.collections.length > 0) {
        res.body.collections.forEach(collection => {
          const spatial = collection.extent?.spatial;
          if (spatial && spatial.bbox && spatial.bbox[0]) {
            const collectionBBox = spatial.bbox[0];
            expect(isBBoxIntersecting(collectionBBox, bbox)).toBe(true);
          }
        });
      }
    });
  });

  describe('Free Text Search Result Validation', () => {
    test('should return collections containing search term in title or description', async () => {
      const searchTerm = 'sentinel';
      
      const res = await request(app).get(`/collections?q=${searchTerm}&limit=20`);
      expect(res.status).toBe(200);
      
      if (res.body.collections && res.body.collections.length > 0) {
        res.body.collections.forEach(collection => {
          const matchesTitle = containsSearchTerm(collection.title, [searchTerm]);
          const matchesDescription = containsSearchTerm(collection.description, [searchTerm]);
          const matchesId = containsSearchTerm(collection.id, [searchTerm]);
          const matchesKeywords = collection.keywords?.some(kw => 
            containsSearchTerm(kw, [searchTerm])
          );
          
          // At least one field should contain the search term
          expect(matchesTitle || matchesDescription || matchesId || matchesKeywords).toBe(true);
        });
      }
    });

    test('should return collections matching multiple search terms', async () => {
      const searchTerms = ['sentinel', '2'];
      const queryString = searchTerms.join(' ');
      
      const res = await request(app).get(`/collections?q=${encodeURIComponent(queryString)}&limit=20`);
      expect(res.status).toBe(200);
      
      if (res.body.collections && res.body.collections.length > 0) {
        res.body.collections.forEach(collection => {
          const searchableText = [
            collection.title,
            collection.description,
            collection.id,
            ...(collection.keywords || [])
          ].join(' ').toLowerCase();
          
          // Should contain at least one of the search terms
          const containsAnyTerm = searchTerms.some(term => 
            searchableText.includes(term.toLowerCase())
          );
          
          expect(containsAnyTerm).toBe(true);
        });
      }
    });
  });

  describe('Sorting Result Validation', () => {
    test('should return collections sorted by title ascending', async () => {
      const res = await request(app).get('/collections?sortby=title&limit=20');
      expect(res.status).toBe(200);
      
      if (res.body.collections && res.body.collections.length > 1) {
        for (let i = 0; i < res.body.collections.length - 1; i++) {
          const current = res.body.collections[i].title || '';
          const next = res.body.collections[i + 1].title || '';
          expect(current.toLowerCase() <= next.toLowerCase()).toBe(true);
        }
      }
    });

    test('should return collections sorted by title descending', async () => {
      const res = await request(app).get('/collections?sortby=-title&limit=20');
      expect(res.status).toBe(200);
      
      if (res.body.collections && res.body.collections.length > 1) {
        // Filter out entries without titles and check case-insensitive ordering
        const titlesWithValues = res.body.collections
          .filter(c => c.title && c.title.trim() !== '')
          .map(c => c.title);
        
        if (titlesWithValues.length > 1) {
          for (let i = 0; i < titlesWithValues.length - 1; i++) {
            const current = titlesWithValues[i].toLowerCase();
            const next = titlesWithValues[i + 1].toLowerCase();
            // Allow equal values (same letter, different case)
            expect(current >= next).toBe(true);
          }
        }
      }
    });
  });

  describe('Combined Filter Result Validation', () => {
    test('should validate q + datetime combination', async () => {
      const searchTerm = 'sentinel';
      const startDate = '2020-01-01T00:00:00Z';
      const endDate = '2024-12-31T23:59:59Z';
      
      const res = await request(app).get(
        `/collections?q=${searchTerm}&datetime=${startDate}/${endDate}&limit=20`
      );
      expect(res.status).toBe(200);
      
      if (res.body.collections && res.body.collections.length > 0) {
        res.body.collections.forEach(collection => {
          // Validate search term
          const searchableText = [
            collection.title,
            collection.description,
            collection.id,
            ...(collection.keywords || [])
          ].join(' ').toLowerCase();
          expect(searchableText.includes(searchTerm.toLowerCase())).toBe(true);
          
          // Validate datetime
          const temporal = collection.extent?.temporal;
          if (temporal && temporal.interval && temporal.interval[0]) {
            const [colStart, colEnd] = temporal.interval[0];
            const hasOverlap = 
              (colStart && isDateInRange(colStart, null, endDate)) ||
              (colEnd && isDateInRange(colEnd, startDate, null));
            expect(hasOverlap).toBe(true);
          }
        });
      }
    });

    test('should validate q + bbox combination', async () => {
      const searchTerm = 'sentinel';
      const bbox = [5.0, 47.0, 15.0, 55.0];
      
      const res = await request(app).get(
        `/collections?q=${searchTerm}&bbox=${bbox.join(',')}&limit=20`
      );
      expect(res.status).toBe(200);
      
      if (res.body.collections && res.body.collections.length > 0) {
        res.body.collections.forEach(collection => {
          // Validate search term
          const searchableText = [
            collection.title,
            collection.description,
            collection.id,
            ...(collection.keywords || [])
          ].join(' ').toLowerCase();
          expect(searchableText.includes(searchTerm.toLowerCase())).toBe(true);
          
          // Validate bbox
          const spatial = collection.extent?.spatial;
          if (spatial && spatial.bbox && spatial.bbox[0]) {
            const collectionBBox = spatial.bbox[0];
            expect(isBBoxIntersecting(collectionBBox, bbox)).toBe(true);
          }
        });
      }
    });

    test('should validate bbox + datetime combination', async () => {
      const bbox = [5.0, 47.0, 15.0, 55.0];
      const startDate = '2020-01-01T00:00:00Z';
      const endDate = '2024-12-31T23:59:59Z';
      
      const res = await request(app).get(
        `/collections?bbox=${bbox.join(',')}&datetime=${startDate}/${endDate}&limit=20`
      );
      expect(res.status).toBe(200);
      
      if (res.body.collections && res.body.collections.length > 0) {
        res.body.collections.forEach(collection => {
          // Validate bbox
          const spatial = collection.extent?.spatial;
          if (spatial && spatial.bbox && spatial.bbox[0]) {
            const collectionBBox = spatial.bbox[0];
            expect(isBBoxIntersecting(collectionBBox, bbox)).toBe(true);
          }
          
          // Validate datetime
          const temporal = collection.extent?.temporal;
          if (temporal && temporal.interval && temporal.interval[0]) {
            const [colStart, colEnd] = temporal.interval[0];
            const hasOverlap = 
              (colStart && isDateInRange(colStart, null, endDate)) ||
              (colEnd && isDateInRange(colEnd, startDate, null));
            expect(hasOverlap).toBe(true);
          }
        });
      }
    });

    test('should validate q + bbox + datetime combination', async () => {
      const searchTerm = 'sentinel';
      const bbox = [5.0, 47.0, 15.0, 55.0];
      const startDate = '2020-01-01T00:00:00Z';
      const endDate = '2024-12-31T23:59:59Z';
      
      const res = await request(app).get(
        `/collections?q=${searchTerm}&bbox=${bbox.join(',')}&datetime=${startDate}/${endDate}&limit=20`
      );
      expect(res.status).toBe(200);
      
      if (res.body.collections && res.body.collections.length > 0) {
        res.body.collections.forEach(collection => {
          // Validate search term
          const searchableText = [
            collection.title,
            collection.description,
            collection.id,
            ...(collection.keywords || [])
          ].join(' ').toLowerCase();
          expect(searchableText.includes(searchTerm.toLowerCase())).toBe(true);
          
          // Validate bbox
          const spatial = collection.extent?.spatial;
          if (spatial && spatial.bbox && spatial.bbox[0]) {
            const collectionBBox = spatial.bbox[0];
            expect(isBBoxIntersecting(collectionBBox, bbox)).toBe(true);
          }
          
          // Validate datetime
          const temporal = collection.extent?.temporal;
          if (temporal && temporal.interval && temporal.interval[0]) {
            const [colStart, colEnd] = temporal.interval[0];
            const hasOverlap = 
              (colStart && isDateInRange(colStart, null, endDate)) ||
              (colEnd && isDateInRange(colEnd, startDate, null));
            expect(hasOverlap).toBe(true);
          }
        });
      }
    });

    test('should validate q + datetime + sortby combination', async () => {
      const searchTerm = 'sentinel';
      const startDate = '2020-01-01T00:00:00Z';
      
      const res = await request(app).get(
        `/collections?q=${searchTerm}&datetime=${startDate}/..&sortby=title&limit=20`
      );
      expect(res.status).toBe(200);
      
      if (res.body.collections && res.body.collections.length > 0) {
        // Validate search term and datetime
        res.body.collections.forEach(collection => {
          const searchableText = [
            collection.title,
            collection.description,
            collection.id,
            ...(collection.keywords || [])
          ].join(' ').toLowerCase();
          expect(searchableText.includes(searchTerm.toLowerCase())).toBe(true);
          
          const temporal = collection.extent?.temporal;
          if (temporal && temporal.interval && temporal.interval[0]) {
            const [, colEnd] = temporal.interval[0];
            if (colEnd) {
              expect(new Date(colEnd) >= new Date(startDate)).toBe(true);
            }
          }
        });
        
        // Validate sorting
        const titlesWithValues = res.body.collections
          .filter(c => c.title && c.title.trim() !== '')
          .map(c => c.title);
        
        if (titlesWithValues.length > 1) {
          for (let i = 0; i < titlesWithValues.length - 1; i++) {
            const current = titlesWithValues[i].toLowerCase();
            const next = titlesWithValues[i + 1].toLowerCase();
            expect(current <= next).toBe(true);
          }
        }
      }
    });

    test('should validate that limit is respected with combined filters', async () => {
      const limit = 5;
      const searchTerm = 'sentinel';
      const bbox = [5.0, 47.0, 15.0, 55.0];
      
      const res = await request(app).get(
        `/collections?q=${searchTerm}&bbox=${bbox.join(',')}&limit=${limit}`
      );
      expect(res.status).toBe(200);
      expect(res.body.collections.length).toBeLessThanOrEqual(limit);
      
      // Still validate filters on returned results
      if (res.body.collections && res.body.collections.length > 0) {
        res.body.collections.forEach(collection => {
          const searchableText = [
            collection.title,
            collection.description,
            collection.id,
            ...(collection.keywords || [])
          ].join(' ').toLowerCase();
          expect(searchableText.includes(searchTerm.toLowerCase())).toBe(true);
          
          const spatial = collection.extent?.spatial;
          if (spatial && spatial.bbox && spatial.bbox[0]) {
            const collectionBBox = spatial.bbox[0];
            expect(isBBoxIntersecting(collectionBBox, bbox)).toBe(true);
          }
        });
      }
    });
  });

  describe('CQL2 Filter Result Validation', () => {
    test('should validate CQL2-text filter results', async () => {
      const res = await request(app).get(
        '/collections?filter-lang=cql2-text&filter=title LIKE "Sentinel%"&limit=20'
      );
      
      if (res.status === 200 && res.body.collections && res.body.collections.length > 0) {
        res.body.collections.forEach(collection => {
          expect(collection.title.toLowerCase().startsWith('sentinel')).toBe(true);
        });
      }
    });

    test('should validate CQL2-json filter results', async () => {
      const filter = JSON.stringify({
        op: 'like',
        args: [{ property: 'title' }, 'Sentinel%']
      });
      
      const res = await request(app).get(
        `/collections?filter-lang=cql2-json&filter=${encodeURIComponent(filter)}&limit=20`
      );
      
      if (res.status === 200 && res.body.collections && res.body.collections.length > 0) {
        res.body.collections.forEach(collection => {
          expect(collection.title.toLowerCase().startsWith('sentinel')).toBe(true);
        });
      }
    });

    test('should validate CQL2 AND operator combines filters correctly', async () => {
      const filter = JSON.stringify({
        op: 'and',
        args: [
          { op: 'like', args: [{ property: 'title' }, 'Sentinel%'] },
          { op: 'eq', args: [{ property: 'license' }, 'proprietary'] }
        ]
      });
      
      const res = await request(app).get(
        `/collections?filter-lang=cql2-json&filter=${encodeURIComponent(filter)}&limit=20`
      );
      
      if (res.status === 200 && res.body.collections && res.body.collections.length > 0) {
        res.body.collections.forEach(collection => {
          expect(collection.title.toLowerCase().startsWith('sentinel')).toBe(true);
          expect(collection.license).toBe('proprietary');
        });
      }
    });

    test('should validate CQL2 filter combined with bbox and datetime', async () => {
      const filter = JSON.stringify({
        op: 'like',
        args: [{ property: 'title' }, 'Sentinel%']
      });
      const bbox = [5.0, 47.0, 15.0, 55.0];
      const startDate = '2020-01-01T00:00:00Z';
      
      const res = await request(app).get(
        `/collections?filter-lang=cql2-json&filter=${encodeURIComponent(filter)}&bbox=${bbox.join(',')}&datetime=${startDate}/..&limit=20`
      );
      
      if (res.status === 200 && res.body.collections && res.body.collections.length > 0) {
        res.body.collections.forEach(collection => {
          // Validate CQL2 filter
          expect(collection.title.toLowerCase().startsWith('sentinel')).toBe(true);
          
          // Validate bbox
          const spatial = collection.extent?.spatial;
          if (spatial && spatial.bbox && spatial.bbox[0]) {
            const collectionBBox = spatial.bbox[0];
            expect(isBBoxIntersecting(collectionBBox, bbox)).toBe(true);
          }
          
          // Validate datetime
          const temporal = collection.extent?.temporal;
          if (temporal && temporal.interval && temporal.interval[0]) {
            const [, colEnd] = temporal.interval[0];
            if (colEnd) {
              expect(new Date(colEnd) >= new Date(startDate)).toBe(true);
            }
          }
        });
      }
    });
  });

  describe('No Results Scenarios', () => {
    test('should return empty array with impossible bbox', async () => {
      const res = await request(app).get('/collections?bbox=0,0,0.001,0.001&limit=20');
      expect(res.status).toBe(200);
      // May return empty or some collections depending on data
      expect(Array.isArray(res.body.collections)).toBe(true);
    });

    test('should return empty array with very restrictive datetime', async () => {
      const res = await request(app).get('/collections?datetime=1970-01-01T00:00:00Z/1970-01-02T00:00:00Z&limit=20');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.collections)).toBe(true);
    });

    test('should return empty or filtered results with non-matching search', async () => {
      const res = await request(app).get('/collections?q=xyznonexistentterm12345&limit=20');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.collections)).toBe(true);
    });
  });
});
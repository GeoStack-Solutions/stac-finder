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
    
    const res2 = await request(app).get(nextLink.href);
    expect(res2.status).toBe(200);
    expect(res2.body.collections).toBeDefined();
  });

  test('should sort collections', async () => {
    const res = await request(app).get('/collections?sortby=title');
    expect(res.status).toBe(200);
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
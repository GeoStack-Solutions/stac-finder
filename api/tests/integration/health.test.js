const request = require('supertest');
const app = require('../../app');

describe('GET /health', () => {
  test('should return 200 when API and database are up', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('api', 'up');
    expect(res.body).toHaveProperty('database', 'up');
    expect(res.body).toHaveProperty('timestamp');
  });

  test('should include database target information', async () => {
    const res = await request(app).get('/health');
    expect(res.body).toHaveProperty('target');
    expect(res.body.target).toHaveProperty('host');
    expect(res.body.target).toHaveProperty('port');
    expect(res.body.target).toHaveProperty('database');
  });
});

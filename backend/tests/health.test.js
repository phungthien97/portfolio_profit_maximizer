const request = require('supertest');
const app = require('../server');

describe('Health Check Endpoint', () => {
  describe('GET /health', () => {
    it('should return status ok', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
    });

    it('should return JSON format', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/);

      expect(response.body).toBeInstanceOf(Object);
    });
  });
});


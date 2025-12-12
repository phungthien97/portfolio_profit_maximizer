const request = require('supertest');
const app = require('../server');

describe('Currency Endpoints', () => {
  describe('GET /currency', () => {
    it('should return default currency USD', async () => {
      const response = await request(app)
        .get('/currency')
        .expect(200);

      expect(response.body).toHaveProperty('currency');
      expect(response.body.currency).toBe('USD');
    });

    it('should return JSON format', async () => {
      const response = await request(app)
        .get('/currency')
        .expect('Content-Type', /json/);

      expect(response.body).toBeInstanceOf(Object);
    });
  });

  describe('POST /currency', () => {
    it('should set currency to USD', async () => {
      const response = await request(app)
        .post('/currency')
        .send({ currency: 'USD' })
        .expect(200);

      expect(response.body).toHaveProperty('currency', 'USD');
    });

    it('should set currency to CAD', async () => {
      const response = await request(app)
        .post('/currency')
        .send({ currency: 'CAD' })
        .expect(200);

      expect(response.body).toHaveProperty('currency', 'CAD');
    });

    it('should handle case-insensitive input', async () => {
      const response = await request(app)
        .post('/currency')
        .send({ currency: 'usd' })
        .expect(200);

      expect(response.body).toHaveProperty('currency', 'USD');
    });

    it('should return 400 if currency is missing', async () => {
      const response = await request(app)
        .post('/currency')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('Currency is required');
    });

    it('should return 400 if currency is not supported', async () => {
      const response = await request(app)
        .post('/currency')
        .send({ currency: 'EUR' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('Unsupported currency');
    });

    it('should persist currency setting', async () => {
      // Set currency to CAD
      await request(app)
        .post('/currency')
        .send({ currency: 'CAD' })
        .expect(200);

      // Verify it persists
      const getResponse = await request(app)
        .get('/currency')
        .expect(200);

      expect(getResponse.body.currency).toBe('CAD');
    });
  });
});


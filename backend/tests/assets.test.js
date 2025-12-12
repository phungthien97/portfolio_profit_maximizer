const request = require('supertest');
const app = require('../server');

describe('Asset Endpoints', () => {
  describe('GET /assets/search', () => {
    it('should return search results for a valid query', async () => {
      const response = await request(app)
        .get('/assets/search')
        .query({ query: 'AAPL' })
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.results)).toBe(true);
      
      if (response.body.results.length > 0) {
        expect(response.body.results[0]).toHaveProperty('symbol');
        expect(response.body.results[0]).toHaveProperty('name');
      }
    }, 10000); // Increase timeout for external API calls

    it('should return 400 if query is missing', async () => {
      const response = await request(app)
        .get('/assets/search')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('Query parameter is required');
    });

    it('should return 400 if query is empty', async () => {
      const response = await request(app)
        .get('/assets/search')
        .query({ query: '' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle search for multiple results', async () => {
      const response = await request(app)
        .get('/assets/search')
        .query({ query: 'Apple' })
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(Array.isArray(response.body.results)).toBe(true);
    }, 10000);
  });

  describe('GET /assets/validate', () => {
    it('should validate a valid symbol', async () => {
      const response = await request(app)
        .get('/assets/validate')
        .query({ symbol: 'AAPL' })
        .expect(200);

      expect(response.body).toHaveProperty('valid', true);
      expect(response.body).toHaveProperty('symbol');
      expect(response.body).toHaveProperty('name');
    }, 10000);

    it('should return valid: false for invalid symbol', async () => {
      const response = await request(app)
        .get('/assets/validate')
        .query({ symbol: 'INVALID123XYZ' })
        .expect(200);

      expect(response.body).toHaveProperty('valid', false);
      expect(response.body).toHaveProperty('symbol');
    }, 10000);

    it('should return 400 if symbol is missing', async () => {
      const response = await request(app)
        .get('/assets/validate')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('Symbol parameter is required');
    });

    it('should return 400 if symbol is empty', async () => {
      const response = await request(app)
        .get('/assets/validate')
        .query({ symbol: '' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle case-insensitive symbol input', async () => {
      const response = await request(app)
        .get('/assets/validate')
        .query({ symbol: 'aapl' })
        .expect(200);

      expect(response.body).toHaveProperty('valid');
      expect(response.body.symbol).toBe('AAPL');
    }, 10000);
  });
});



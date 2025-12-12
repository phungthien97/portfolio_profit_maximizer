const request = require('supertest');
const app = require('../server');

describe('Data Fetch Endpoint', () => {
  describe('POST /data/fetch', () => {
    it('should fetch historical data for valid assets', async () => {
      const today = new Date();
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(today.getFullYear() - 1);

      const startDate = oneYearAgo.toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];

      const response = await request(app)
        .post('/data/fetch')
        .send({
          assets: ['AAPL'],
          startDate,
          endDate,
          currency: 'USD'
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('AAPL');
      
      if (response.body.data.AAPL.hasData) {
        expect(response.body.data.AAPL).toHaveProperty('dates');
        expect(response.body.data.AAPL).toHaveProperty('prices');
        expect(Array.isArray(response.body.data.AAPL.dates)).toBe(true);
        expect(Array.isArray(response.body.data.AAPL.prices)).toBe(true);
        expect(response.body.data.AAPL.dates.length).toBe(response.body.data.AAPL.prices.length);
      }
    }, 15000);

    it('should return 400 if assets array is missing', async () => {
      const response = await request(app)
        .post('/data/fetch')
        .send({
          startDate: '2023-01-01',
          endDate: '2023-12-31',
          currency: 'USD'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('Assets array is required');
    });

    it('should return 400 if assets array is empty', async () => {
      const response = await request(app)
        .post('/data/fetch')
        .send({
          assets: [],
          startDate: '2023-01-01',
          endDate: '2023-12-31',
          currency: 'USD'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if dates are missing', async () => {
      const response = await request(app)
        .post('/data/fetch')
        .send({
          assets: ['AAPL'],
          currency: 'USD'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('startDate and endDate are required');
    });

    it('should return 400 if date format is invalid', async () => {
      const response = await request(app)
        .post('/data/fetch')
        .send({
          assets: ['AAPL'],
          startDate: '2023/01/01',
          endDate: '2023-12-31',
          currency: 'USD'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('YYYY-MM-DD format');
    });

    it('should return 400 if startDate is after endDate', async () => {
      const response = await request(app)
        .post('/data/fetch')
        .send({
          assets: ['AAPL'],
          startDate: '2023-12-31',
          endDate: '2023-01-01',
          currency: 'USD'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('startDate must be before');
    });

    it('should handle multiple assets', async () => {
      const today = new Date();
      const sixMonthsAgo = new Date(today);
      sixMonthsAgo.setMonth(today.getMonth() - 6);

      const startDate = sixMonthsAgo.toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];

      const response = await request(app)
        .post('/data/fetch')
        .send({
          assets: ['AAPL', 'MSFT'],
          startDate,
          endDate,
          currency: 'USD'
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('AAPL');
      expect(response.body.data).toHaveProperty('MSFT');
      expect(response.body.summary.totalAssets).toBe(2);
    }, 20000);

    it('should handle invalid symbols gracefully', async () => {
      const today = new Date();
      const oneYearAgo = new Date(today);
      oneYearAgo.setFullYear(today.getFullYear() - 1);

      const startDate = oneYearAgo.toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];

      const response = await request(app)
        .post('/data/fetch')
        .send({
          assets: ['INVALID123XYZ'],
          startDate,
          endDate,
          currency: 'USD'
        })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('INVALID123XYZ');
      expect(response.body.data.INVALID123XYZ.hasData).toBe(false);
      expect(response.body.summary.failed).toBeGreaterThan(0);
    }, 15000);
  });
});



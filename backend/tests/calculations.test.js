const request = require('supertest');
const app = require('../server');

describe('Calculations Endpoint', () => {
  describe('POST /calculations/metrics', () => {
    // Sample data for testing
    const createSampleData = (symbol, prices) => {
      const dates = [];
      const startDate = new Date('2023-01-01');
      for (let i = 0; i < prices.length; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }
      return {
        [symbol]: {
          dates,
          prices,
          hasData: true
        }
      };
    };

    it('should calculate metrics for valid data', () => {
      // Simple test case: prices going from 100 to 110 over 10 days
      const prices = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110];
      const data = createSampleData('TEST', prices);

      const response = request(app)
        .post('/calculations/metrics')
        .send({
          data,
          assets: ['TEST']
        })
        .expect(200);

      return response.then(res => {
        expect(res.body).toHaveProperty('metrics');
        expect(res.body.metrics).toHaveProperty('TEST');
        expect(res.body.metrics.TEST).toHaveProperty('return');
        expect(res.body.metrics.TEST).toHaveProperty('risk');
        expect(res.body.metrics.TEST).toHaveProperty('minPrice');
        expect(res.body.metrics.TEST).toHaveProperty('maxPrice');
        expect(res.body.metrics.TEST.minPrice).toBe(100);
        expect(res.body.metrics.TEST.maxPrice).toBe(110);
      });
    });

    it('should return 400 if data is missing', async () => {
      const response = await request(app)
        .post('/calculations/metrics')
        .send({
          assets: ['TEST']
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('Data object is required');
    });

    it('should return 400 if assets array is missing', async () => {
      const data = createSampleData('TEST', [100, 110]);

      const response = await request(app)
        .post('/calculations/metrics')
        .send({
          data
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('Assets array is required');
    });

    it('should handle assets with no data', () => {
      const data = {
        TEST: {
          dates: [],
          prices: [],
          hasData: false,
          error: 'No data available'
        }
      };

      const response = request(app)
        .post('/calculations/metrics')
        .send({
          data,
          assets: ['TEST']
        })
        .expect(200);

      return response.then(res => {
        expect(res.body).toHaveProperty('metrics');
        expect(res.body.metrics.TEST).toHaveProperty('return', null);
        expect(res.body.metrics.TEST).toHaveProperty('error');
      });
    });

    it('should handle insufficient data (less than 2 points)', () => {
      const data = createSampleData('TEST', [100]);

      const response = request(app)
        .post('/calculations/metrics')
        .send({
          data,
          assets: ['TEST']
        })
        .expect(200);

      return response.then(res => {
        expect(res.body).toHaveProperty('metrics');
        expect(res.body.metrics.TEST).toHaveProperty('return', null);
        expect(res.body.metrics.TEST).toHaveProperty('risk', null);
      });
    });

    it('should calculate min and max prices correctly', () => {
      const prices = [150, 100, 120, 90, 130, 110];
      const data = createSampleData('TEST', prices);

      const response = request(app)
        .post('/calculations/metrics')
        .send({
          data,
          assets: ['TEST']
        })
        .expect(200);

      return response.then(res => {
        expect(res.body.metrics.TEST.minPrice).toBe(90);
        expect(res.body.metrics.TEST.maxPrice).toBe(150);
      });
    });

    it('should handle multiple assets', () => {
      const data = {
        ...createSampleData('ASSET1', [100, 110, 120]),
        ...createSampleData('ASSET2', [50, 55, 60])
      };

      const response = request(app)
        .post('/calculations/metrics')
        .send({
          data,
          assets: ['ASSET1', 'ASSET2']
        })
        .expect(200);

      return response.then(res => {
        expect(res.body).toHaveProperty('metrics');
        expect(res.body.metrics).toHaveProperty('ASSET1');
        expect(res.body.metrics).toHaveProperty('ASSET2');
        expect(res.body.summary.totalAssets).toBe(2);
      });
    });

    it('should handle interpolateMissing flag', () => {
      // Create data with gaps
      const prices = [100, 102, 104, 108, 110];
      const data = createSampleData('TEST', prices);

      const response = request(app)
        .post('/calculations/metrics')
        .send({
          data,
          assets: ['TEST'],
          interpolateMissing: true
        })
        .expect(200);

      return response.then(res => {
        expect(res.body).toHaveProperty('metrics');
        expect(res.body.metrics.TEST).toHaveProperty('return');
        expect(res.body.metrics.TEST).toHaveProperty('risk');
      });
    });
  });
});



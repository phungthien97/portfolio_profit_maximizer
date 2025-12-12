const request = require('supertest');
const app = require('../server');

describe('Optimization Endpoints', () => {
  describe('POST /optimization/frontier', () => {
    const createSampleMetrics = () => ({
      AAPL: {
        return: 15.5,
        risk: 20.3,
        minPrice: 150,
        maxPrice: 180
      },
      MSFT: {
        return: 12.8,
        risk: 18.5,
        minPrice: 300,
        maxPrice: 350
      }
    });

    const createSampleData = () => {
      const dates = [];
      const startDate = new Date('2023-01-01');
      for (let i = 0; i < 100; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }
      
      return {
        AAPL: {
          dates,
          prices: Array.from({ length: 100 }, (_, i) => 150 + Math.random() * 30),
          hasData: true
        },
        MSFT: {
          dates,
          prices: Array.from({ length: 100 }, (_, i) => 300 + Math.random() * 50),
          hasData: true
        }
      };
    };

    it('should compute efficient frontier for valid metrics', async () => {
      const metrics = createSampleMetrics();
      const data = createSampleData();

      const response = await request(app)
        .post('/optimization/frontier')
        .send({
          metrics,
          data,
          assets: ['AAPL', 'MSFT']
        })
        .expect(200);

      expect(response.body).toHaveProperty('points');
      expect(response.body).toHaveProperty('minReturn');
      expect(response.body).toHaveProperty('maxReturn');
      expect(Array.isArray(response.body.points)).toBe(true);
      expect(response.body.points.length).toBeGreaterThan(0);
      
      // Check frontier point structure
      if (response.body.points.length > 0) {
        const point = response.body.points[0];
        expect(point).toHaveProperty('risk');
        expect(point).toHaveProperty('return');
        expect(point).toHaveProperty('weights');
        expect(Array.isArray(point.weights)).toBe(true);
      }
    }, 15000);

    it('should return 400 if metrics are missing', async () => {
      const response = await request(app)
        .post('/optimization/frontier')
        .send({
          data: createSampleData(),
          assets: ['AAPL', 'MSFT']
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('Metrics object is required');
    });

    it('should return 400 if less than 2 assets', async () => {
      const metrics = createSampleMetrics();

      const response = await request(app)
        .post('/optimization/frontier')
        .send({
          metrics,
          assets: ['AAPL']
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('At least 2 assets');
    });

    it('should handle assets with invalid metrics', async () => {
      const metrics = {
        AAPL: {
          return: null,
          risk: null
        },
        MSFT: {
          return: 12.8,
          risk: 18.5
        }
      };

      const response = await request(app)
        .post('/optimization/frontier')
        .send({
          metrics,
          assets: ['AAPL', 'MSFT']
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /optimization/allocation', () => {
    const createSampleFrontier = () => ({
      points: [
        { risk: 10.0, return: 8.0, weights: [{ asset: 'AAPL', weight: 0.3 }, { asset: 'MSFT', weight: 0.7 }] },
        { risk: 15.0, return: 12.0, weights: [{ asset: 'AAPL', weight: 0.5 }, { asset: 'MSFT', weight: 0.5 }] },
        { risk: 20.0, return: 15.0, weights: [{ asset: 'AAPL', weight: 0.7 }, { asset: 'MSFT', weight: 0.3 }] }
      ],
      minReturn: 8.0,
      maxReturn: 15.0
    });

    it('should compute optimal allocation for valid inputs', async () => {
      const frontier = createSampleFrontier();

      const response = await request(app)
        .post('/optimization/allocation')
        .send({
          frontier,
          expectedReturn: 12.0,
          investmentAmount: 10000
        })
        .expect(200);

      expect(response.body).toHaveProperty('allocations');
      expect(response.body).toHaveProperty('portfolioMetrics');
      expect(response.body).toHaveProperty('explanation');
      expect(response.body).toHaveProperty('investmentAmount');
      
      // Check allocations structure
      expect(response.body.allocations).toHaveProperty('AAPL');
      expect(response.body.allocations).toHaveProperty('MSFT');
      expect(response.body.allocations.AAPL).toHaveProperty('percent');
      expect(response.body.allocations.AAPL).toHaveProperty('amount');
    });

    it('should return 400 if frontier is missing', async () => {
      const response = await request(app)
        .post('/optimization/allocation')
        .send({
          expectedReturn: 12.0,
          investmentAmount: 10000
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('Frontier data is required');
    });

    it('should return 400 if expected return is out of range', async () => {
      const frontier = createSampleFrontier();

      const response = await request(app)
        .post('/optimization/allocation')
        .send({
          frontier,
          expectedReturn: 20.0, // Above maxReturn
          investmentAmount: 10000
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('Expected return must be between');
    });

    it('should return 400 if investment amount is invalid', async () => {
      const frontier = createSampleFrontier();

      const response = await request(app)
        .post('/optimization/allocation')
        .send({
          frontier,
          expectedReturn: 12.0,
          investmentAmount: -1000
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('positive number');
    });

    it('should calculate correct dollar amounts', async () => {
      const frontier = createSampleFrontier();

      const response = await request(app)
        .post('/optimization/allocation')
        .send({
          frontier,
          expectedReturn: 12.0,
          investmentAmount: 10000
        })
        .expect(200);

      // Check that allocations sum to approximately 100%
      const totalPercent = Object.values(response.body.allocations)
        .reduce((sum, alloc) => sum + alloc.percent, 0);
      
      expect(totalPercent).toBeCloseTo(100, 1);
      
      // Check that amounts sum to investment amount
      const totalAmount = Object.values(response.body.allocations)
        .reduce((sum, alloc) => sum + alloc.amount, 0);
      
      expect(totalAmount).toBeCloseTo(10000, 2);
    });
  });
});



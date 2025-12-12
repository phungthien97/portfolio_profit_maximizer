const express = require('express');
const router = express.Router();
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

/**
 * POST /data/fetch
 * Fetch historical end-of-day data for multiple assets
 * Body: { assets: string[], startDate: string (YYYY-MM-DD), endDate: string (YYYY-MM-DD), currency: string }
 */
router.post('/fetch', async (req, res) => {
  try {
    const { assets, startDate, endDate, currency } = req.body;

    // Validation
    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return res.status(400).json({
        error: {
          message: 'Assets array is required and must not be empty',
          status: 400
        }
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: {
          message: 'startDate and endDate are required (YYYY-MM-DD format)',
          status: 400
        }
      });
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return res.status(400).json({
        error: {
          message: 'Dates must be in YYYY-MM-DD format',
          status: 400
        }
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        error: {
          message: 'Invalid date values',
          status: 400
        }
      });
    }

    if (start > end) {
      return res.status(400).json({
        error: {
          message: 'startDate must be before or equal to endDate',
          status: 400
        }
      });
    }

    // Fetch data for each asset
    const results = {};
    const errors = [];

    for (const asset of assets) {
      try {
        const symbol = asset.trim().toUpperCase();
        
        // Get asset currency from quote API
        let assetCurrency = 'USD'; // Default to USD
        try {
          const quoteData = await yahooFinance.quote(symbol);
          if (quoteData && quoteData.currency) {
            assetCurrency = quoteData.currency;
          }
        } catch (quoteError) {
          console.warn(`Could not fetch currency for ${symbol}, defaulting to USD`);
        }
        
        // Fetch historical data using chart() API (v3 - historical() is deprecated)
        const chartData = await yahooFinance.chart(symbol, {
          period1: startDate,
          period2: endDate,
          interval: '1d'
        }, { validateResult: false });
        
        // Extract quotes from chart data
        const quote = chartData.quotes || [];

        if (!quote || quote.length === 0) {
          results[symbol] = {
            dates: [],
            prices: [],
            hasData: false,
            currency: assetCurrency,
            error: 'No data available for this symbol in the specified date range'
          };
          errors.push({
            symbol,
            error: 'No data available'
          });
          continue;
        }

        // Extract dates and closing prices from chart data
        const dates = quote.map(item => {
          const date = item.date instanceof Date ? item.date : new Date(item.date);
          return date.toISOString().split('T')[0];
        });
        const prices = quote.map(item => item.close || item.adjClose || 0).filter(p => p > 0);

        // Check for missing data (gaps in dates)
        const expectedDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        const actualDays = dates.length;
        const missingDataRatio = 1 - (actualDays / expectedDays);

        results[symbol] = {
          dates,
          prices,
          currency: assetCurrency,
          hasData: true,
          dataQuality: {
            totalDays: actualDays,
            expectedDays: expectedDays,
            missingDataRatio: missingDataRatio > 0.1 ? missingDataRatio : 0, // Flag if >10% missing
            hasGaps: missingDataRatio > 0.1
          }
        };
      } catch (error) {
        console.error(`Error fetching data for ${asset}:`, error);
        results[asset] = {
          dates: [],
          prices: [],
          hasData: false,
          error: error.message || 'Failed to fetch data'
        };
        errors.push({
          symbol: asset,
          error: error.message || 'Failed to fetch data'
        });
      }
    }

    res.status(200).json({
      data: results,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        totalAssets: assets.length,
        successful: Object.values(results).filter(r => r.hasData).length,
        failed: errors.length,
        dateRange: {
          start: startDate,
          end: endDate
        },
        currency: currency || 'USD'
      }
    });
  } catch (error) {
    console.error('Error in data fetch endpoint:', error);
    res.status(500).json({
      error: {
        message: 'Failed to fetch historical data. Please try again.',
        status: 500,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

module.exports = router;



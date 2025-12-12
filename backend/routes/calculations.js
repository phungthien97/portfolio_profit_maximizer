const express = require('express');
const router = express.Router();
const { mean, std, min, max } = require('mathjs');
const { convertPriceArray } = require('../utils/currencyConverter');

/**
 * Calculate annualized return using geometric mean
 * @param {number[]} prices - Array of closing prices
 * @param {number} tradingDaysPerYear - Number of trading days per year (default: 252)
 * @returns {number} Annualized return as a percentage
 */
function calculateAnnualizedReturn(prices, tradingDaysPerYear = 252) {
  if (!prices || prices.length < 2) {
    return null;
  }

  // Calculate daily returns
  const dailyReturns = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0) {
      dailyReturns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
  }

  if (dailyReturns.length === 0) {
    return null;
  }

  // Calculate geometric mean of daily returns
  let product = 1;
  for (const ret of dailyReturns) {
    product *= (1 + ret);
  }
  const geometricMean = Math.pow(product, 1 / dailyReturns.length);

  // Annualize: (1 + daily_return)^tradingDays - 1
  const annualizedReturn = (Math.pow(geometricMean, tradingDaysPerYear) - 1) * 100;

  return annualizedReturn;
}

/**
 * Calculate annualized risk (standard deviation)
 * @param {number[]} prices - Array of closing prices
 * @param {number} tradingDaysPerYear - Number of trading days per year (default: 252)
 * @returns {number} Annualized risk (std dev) as a percentage
 */
function calculateAnnualizedRisk(prices, tradingDaysPerYear = 252) {
  if (!prices || prices.length < 2) {
    return null;
  }

  // Calculate daily returns
  const dailyReturns = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0) {
      dailyReturns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
  }

  if (dailyReturns.length === 0) {
    return null;
  }

  // Calculate standard deviation of daily returns
  const dailyStdDev = std(dailyReturns);

  // Annualize: daily_std * sqrt(tradingDays)
  const annualizedRisk = dailyStdDev * Math.sqrt(tradingDaysPerYear) * 100;

  return annualizedRisk;
}

/**
 * Interpolate missing data points using linear interpolation
 * @param {string[]} dates - Array of date strings
 * @param {number[]} prices - Array of prices
 * @returns {Object} Object with interpolated dates and prices
 */
function interpolateMissingData(dates, prices) {
  if (dates.length === 0 || prices.length === 0) {
    return { dates, prices };
  }

  // Convert dates to timestamps for easier calculation
  const dataPoints = dates.map((date, index) => ({
    date,
    timestamp: new Date(date).getTime(),
    price: prices[index]
  })).filter(point => !isNaN(point.timestamp) && point.price != null);

  if (dataPoints.length === 0) {
    return { dates, prices };
  }

  // Sort by timestamp
  dataPoints.sort((a, b) => a.timestamp - b.timestamp);

  // Find date range
  const startDate = new Date(dataPoints[0].date);
  const endDate = new Date(dataPoints[dataPoints.length - 1].date);
  
  // Generate all trading days (excluding weekends)
  const interpolatedDates = [];
  const interpolatedPrices = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const dateStr = currentDate.toISOString().split('T')[0];
      interpolatedDates.push(dateStr);

      // Find closest data points for interpolation
      const timestamp = currentDate.getTime();
      let price = null;

      // Check if we have exact data
      const exactMatch = dataPoints.find(p => p.date === dateStr);
      if (exactMatch) {
        price = exactMatch.price;
      } else {
        // Find previous and next data points
        let prevPoint = null;
        let nextPoint = null;

        for (let i = 0; i < dataPoints.length; i++) {
          if (dataPoints[i].timestamp <= timestamp) {
            prevPoint = dataPoints[i];
          }
          if (dataPoints[i].timestamp >= timestamp && !nextPoint) {
            nextPoint = dataPoints[i];
            break;
          }
        }

        if (prevPoint && nextPoint) {
          // Linear interpolation
          const timeDiff = nextPoint.timestamp - prevPoint.timestamp;
          const priceDiff = nextPoint.price - prevPoint.price;
          const ratio = (timestamp - prevPoint.timestamp) / timeDiff;
          price = prevPoint.price + (priceDiff * ratio);
        } else if (prevPoint) {
          // Use last available value
          price = prevPoint.price;
        } else if (nextPoint) {
          // Use first available value
          price = nextPoint.price;
        }
      }

      if (price != null) {
        interpolatedPrices.push(price);
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    dates: interpolatedDates,
    prices: interpolatedPrices
  };
}

/**
 * POST /calculations/metrics
 * Calculate annualized return, risk, and min/max prices for assets
 * Body: { data: object from /data/fetch, assets: string[], interpolateMissing: boolean, targetCurrency: string }
 */
router.post('/metrics', async (req, res) => {
  try {
    const { data, assets, interpolateMissing = false, targetCurrency = 'USD' } = req.body;

    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        error: {
          message: 'Data object is required',
          status: 400
        }
      });
    }

    if (!assets || !Array.isArray(assets) || assets.length === 0) {
      return res.status(400).json({
        error: {
          message: 'Assets array is required and must not be empty',
          status: 400
        }
      });
    }

    const results = {};
    const errors = [];

    for (const asset of assets) {
      const symbol = asset.trim().toUpperCase();
      const assetData = data[symbol];

      if (!assetData) {
        errors.push({
          symbol,
          error: 'No data found for this asset'
        });
        continue;
      }

      if (!assetData.hasData) {
        errors.push({
          symbol,
          error: assetData.error || 'No data available'
        });
        results[symbol] = {
          return: null,
          risk: null,
          minPrice: null,
          maxPrice: null,
          error: assetData.error || 'No data available'
        };
        continue;
      }

      let dates = assetData.dates || [];
      let prices = assetData.prices || [];
      const assetCurrency = assetData.currency || 'USD';

      // Convert prices to target currency if needed
      if (assetCurrency !== targetCurrency && prices.length > 0) {
        try {
          prices = await convertPriceArray(prices, assetCurrency, targetCurrency);
        } catch (conversionError) {
          console.error(`Error converting prices for ${symbol}:`, conversionError);
          // Continue with original prices if conversion fails
        }
      }

      // Interpolate missing data if requested
      if (interpolateMissing && dates.length > 0 && prices.length > 0) {
        const interpolated = interpolateMissingData(dates, prices);
        dates = interpolated.dates;
        prices = interpolated.prices;
      }

      if (prices.length < 2) {
        errors.push({
          symbol,
          error: 'Insufficient data for calculations (need at least 2 data points)'
        });
        results[symbol] = {
          return: null,
          risk: null,
          minPrice: prices.length > 0 ? prices[0] : null,
          maxPrice: prices.length > 0 ? prices[0] : null,
          error: 'Insufficient data'
        };
        continue;
      }

      // Calculate metrics
      const annualizedReturn = calculateAnnualizedReturn(prices);
      const annualizedRisk = calculateAnnualizedRisk(prices);
      const minPrice = min(prices);
      const maxPrice = max(prices);

      results[symbol] = {
        return: annualizedReturn !== null ? parseFloat(annualizedReturn.toFixed(2)) : null,
        risk: annualizedRisk !== null ? parseFloat(annualizedRisk.toFixed(2)) : null,
        minPrice: parseFloat(minPrice.toFixed(2)),
        maxPrice: parseFloat(maxPrice.toFixed(2)),
        dataPoints: prices.length
      };
    }

    res.status(200).json({
      metrics: results,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        totalAssets: assets.length,
        successful: Object.values(results).filter(r => r.return !== null).length,
        failed: errors.length
      }
    });
  } catch (error) {
    console.error('Error in calculations endpoint:', error);
    res.status(500).json({
      error: {
        message: 'Failed to calculate metrics. Please try again.',
        status: 500,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

module.exports = router;



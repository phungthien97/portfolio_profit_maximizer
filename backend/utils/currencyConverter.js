const axios = require('axios');

// Cache for exchange rates (refresh every hour)
let exchangeRateCache = {};
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Fetch exchange rates from a free API
 * @param {string} baseCurrency - Base currency code (e.g., 'USD')
 * @returns {Promise<Object>} Object with currency codes as keys and rates as values
 */
async function fetchExchangeRates(baseCurrency = 'USD') {
  try {
    // Use exchangerate-api.com free tier (no API key required)
    const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`, {
      timeout: 5000
    });
    
    if (response.data && response.data.rates) {
      return response.data.rates;
    }
    throw new Error('Invalid response from exchange rate API');
  } catch (error) {
    console.error('Error fetching exchange rates:', error.message);
    // Fallback: return empty rates (will use 1:1 conversion)
    return {};
  }
}

/**
 * Get exchange rates with caching
 * @param {string} baseCurrency - Base currency code
 * @returns {Promise<Object>} Exchange rates object
 */
async function getExchangeRates(baseCurrency = 'USD') {
  const now = Date.now();
  const cacheKey = baseCurrency;

  // Check if cache is valid
  if (exchangeRateCache[cacheKey] && (now - cacheTimestamp) < CACHE_DURATION) {
    return exchangeRateCache[cacheKey];
  }

  // Fetch new rates
  const rates = await fetchExchangeRates(baseCurrency);
  
  // Store in cache
  exchangeRateCache[cacheKey] = rates;
  cacheTimestamp = now;

  return rates;
}

/**
 * Convert amount from one currency to another
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {Promise<number>} Converted amount
 */
async function convertCurrency(amount, fromCurrency, toCurrency) {
  // If same currency, no conversion needed
  if (fromCurrency === toCurrency) {
    return amount;
  }

  // Handle null/undefined
  if (amount === null || amount === undefined || isNaN(amount)) {
    return amount;
  }

  try {
    // Get exchange rates (using USD as base)
    const rates = await getExchangeRates('USD');

    // If rates are empty, return original amount
    if (!rates || Object.keys(rates).length === 0) {
      console.warn('Exchange rates not available, returning original amount');
      return amount;
    }

    // Convert: fromCurrency -> USD -> toCurrency
    let amountInUSD;
    if (fromCurrency === 'USD') {
      amountInUSD = amount;
    } else if (rates[fromCurrency]) {
      // Convert from source currency to USD
      amountInUSD = amount / rates[fromCurrency];
    } else {
      console.warn(`Exchange rate not found for ${fromCurrency}, returning original amount`);
      return amount;
    }

    // Convert from USD to target currency
    if (toCurrency === 'USD') {
      return amountInUSD;
    } else if (rates[toCurrency]) {
      return amountInUSD * rates[toCurrency];
    } else {
      console.warn(`Exchange rate not found for ${toCurrency}, returning USD equivalent`);
      return amountInUSD;
    }
  } catch (error) {
    console.error('Error converting currency:', error);
    // Return original amount on error
    return amount;
  }
}

/**
 * Convert an array of prices from one currency to another
 * @param {number[]} prices - Array of prices to convert
 * @param {string} fromCurrency - Source currency code
 * @param {string} toCurrency - Target currency code
 * @returns {Promise<number[]>} Array of converted prices
 */
async function convertPriceArray(prices, fromCurrency, toCurrency) {
  if (fromCurrency === toCurrency || !prices || prices.length === 0) {
    return prices;
  }

  try {
    const rates = await getExchangeRates('USD');
    
    if (!rates || Object.keys(rates).length === 0) {
      return prices;
    }

    // Calculate conversion rate
    let conversionRate = 1;
    if (fromCurrency !== 'USD' && rates[fromCurrency]) {
      conversionRate = 1 / rates[fromCurrency];
    }
    if (toCurrency !== 'USD' && rates[toCurrency]) {
      conversionRate = conversionRate * rates[toCurrency];
    }

    // Convert all prices
    return prices.map(price => {
      if (price === null || price === undefined || isNaN(price)) {
        return price;
      }
      return price * conversionRate;
    });
  } catch (error) {
    console.error('Error converting price array:', error);
    return prices;
  }
}

module.exports = {
  convertCurrency,
  convertPriceArray,
  getExchangeRates
};


const express = require('express');
const router = express.Router();
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

/**
 * GET /assets/search?query=string
 * Search for ticker symbols matching the query
 */
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        error: {
          message: 'Query parameter is required',
          status: 400
        }
      });
    }

    // Use Yahoo Finance search (v3 API)
    const searchResults = await yahooFinance.search(query.trim());

    // Handle v3 response structure - check if quotes exists or if it's an array
    let quotes = [];
    if (searchResults.quotes) {
      quotes = searchResults.quotes;
    } else if (Array.isArray(searchResults)) {
      quotes = searchResults;
    } else {
      quotes = [];
    }

    // Format results to include symbol and name
    const formattedResults = quotes
      .filter(quote => quote && quote.symbol && (quote.shortname || quote.longname))
      .map(quote => ({
        symbol: quote.symbol,
        name: quote.shortname || quote.longname || quote.symbol
      }))
      .slice(0, 20); // Limit to top 20 results

    res.status(200).json({
      results: formattedResults,
      count: formattedResults.length
    });
  } catch (error) {
    console.error('Error searching assets:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: {
        message: 'Failed to search for assets. Please try again.',
        status: 500,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
});

/**
 * GET /assets/validate?symbol=string
 * Validate if a ticker symbol is valid via Yahoo Finance
 */
router.get('/validate', async (req, res) => {
  try {
    const { symbol } = req.query;

    if (!symbol || symbol.trim().length === 0) {
      return res.status(400).json({
        error: {
          message: 'Symbol parameter is required',
          status: 400
        }
      });
    }

    const ticker = symbol.trim().toUpperCase();

    // Try to fetch quote data for the symbol (v3 API)
    try {
      const quote = await yahooFinance.quote(ticker);

      if (quote && quote.symbol) {
        res.status(200).json({
          valid: true,
          symbol: quote.symbol,
          name: quote.longName || quote.shortName || quote.symbol,
          currency: quote.currency || 'USD',
          exchange: quote.exchange || 'N/A'
        });
      } else {
        res.status(200).json({
          valid: false,
          symbol: ticker,
          message: 'Symbol not found'
        });
      }
    } catch (quoteError) {
      // If quote fails, symbol is likely invalid
      console.error(`Quote error for ${ticker}:`, quoteError.message);
      res.status(200).json({
        valid: false,
        symbol: ticker,
        message: 'Invalid symbol or symbol not found'
      });
    }
  } catch (error) {
    console.error('Error validating asset:', error);
    res.status(500).json({
      error: {
        message: 'Failed to validate asset. Please try again.',
        status: 500,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

module.exports = router;



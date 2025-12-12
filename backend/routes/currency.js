const express = require('express');
const router = express.Router();

// Supported currencies
const SUPPORTED_CURRENCIES = ['USD', 'CAD'];

// In-memory storage for currency (session simulation)
// In a real app, this would be stored per session
let currentCurrency = 'USD';

/**
 * GET /currency
 * Retrieve the current currency setting
 */
router.get('/', (req, res) => {
  res.status(200).json({ currency: currentCurrency });
});

/**
 * POST /currency
 * Set the currency for the session
 * Body: { currency: string }
 */
router.post('/', (req, res) => {
  const { currency } = req.body;

  // Validate currency is provided
  if (!currency) {
    return res.status(400).json({
      error: {
        message: 'Currency is required',
        status: 400
      }
    });
  }

  // Validate currency is supported
  if (!SUPPORTED_CURRENCIES.includes(currency.toUpperCase())) {
    return res.status(400).json({
      error: {
        message: `Unsupported currency. Supported currencies: ${SUPPORTED_CURRENCIES.join(', ')}`,
        status: 400
      }
    });
  }

  // Set currency (case-insensitive input, store uppercase)
  currentCurrency = currency.toUpperCase();

  res.status(200).json({ currency: currentCurrency });
});

module.exports = router;


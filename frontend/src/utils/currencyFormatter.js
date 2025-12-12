/**
 * Format a number as currency with the specified currency code
 * @param {number} amount - The amount to format
 * @param {string} currencyCode - The currency code (e.g., 'USD', 'EUR', 'VND')
 * @param {object} options - Additional formatting options
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currencyCode = 'USD', options = {}) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'N/A';
  }

  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showCurrencyCode = true
  } = options;

  // Format the number with locale-specific formatting
  const formattedAmount = parseFloat(amount).toLocaleString(undefined, {
    minimumFractionDigits,
    maximumFractionDigits
  });

  // Return with currency code prefix
  if (showCurrencyCode) {
    return `${currencyCode} ${formattedAmount}`;
  }
  
  return formattedAmount;
};

/**
 * Format currency for display in tables (without currency code prefix)
 * @param {number} amount - The amount to format
 * @param {object} options - Additional formatting options
 * @returns {string} Formatted amount string
 */
export const formatCurrencyAmount = (amount, options = {}) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'N/A';
  }

  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2
  } = options;

  return parseFloat(amount).toLocaleString(undefined, {
    minimumFractionDigits,
    maximumFractionDigits
  });
};


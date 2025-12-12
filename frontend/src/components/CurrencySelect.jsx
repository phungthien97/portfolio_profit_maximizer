import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getCurrency, setCurrency as setCurrencyAPI } from '../services/api';

const CurrencySelect = () => {
  const navigate = useNavigate();
  const { currency, setCurrency: setCurrencyContext } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch current currency from backend
    getCurrency()
      .then(response => {
        setCurrencyContext(response.data.currency);
      })
      .catch(err => {
        console.error('Error fetching currency:', err);
      });
  }, [setCurrencyContext]);

  const handleCurrencyChange = async (e) => {
    const newCurrency = e.target.value;
    setLoading(true);
    setError('');

    try {
      await setCurrencyAPI(newCurrency);
      setCurrencyContext(newCurrency);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to set currency');
      console.error('Error setting currency:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    navigate('/portfolio');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Step 0: Select Currency
        </h2>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Choose the currency for all inputs and outputs. This will be used throughout your portfolio analysis.
          </p>
          
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
            Currency
          </label>
          <select
            id="currency"
            value={currency}
            onChange={handleCurrencyChange}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
          >
            <option value="USD">USD - US Dollar</option>
            <option value="CAD">CAD - Canadian Dollar</option>
          </select>
          
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleNext}
            disabled={loading || !currency}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Next: Add Portfolio Assets
          </button>
        </div>
      </div>
    </div>
  );
};

export default CurrencySelect;



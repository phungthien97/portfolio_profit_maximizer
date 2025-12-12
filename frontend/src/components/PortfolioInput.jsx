import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { searchAssets, validateAsset } from '../services/api';

const PortfolioInput = () => {
  const navigate = useNavigate();
  const { assets, setAssets, currency } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef(null);
  const resultsRef = useRef(null);

  useEffect(() => {
    // Close results when clicking outside
    const handleClickOutside = (event) => {
      if (resultsRef.current && !resultsRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await searchAssets(query.trim());
      setSearchResults(response.data.results || []);
      setShowResults(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to search assets');
      setSearchResults([]);
      setShowResults(false);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setError('');

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(value);
    }, 300);
  };

  const handleAddAsset = async (symbol) => {
    // Check if already added
    if (assets.some(a => a.symbol === symbol)) {
      setError(`${symbol} is already in your portfolio`);
      return;
    }

    setValidating(true);
    setError('');

    try {
      const response = await validateAsset(symbol);
      
      if (response.data.valid) {
        setAssets([...assets, {
          symbol: response.data.symbol,
          name: response.data.name
        }]);
        setSearchQuery('');
        setSearchResults([]);
        setShowResults(false);
      } else {
        setError(`Invalid symbol: ${symbol}. Please select a valid asset from the search results.`);
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to validate asset');
    } finally {
      setValidating(false);
    }
  };

  const handleRemoveAsset = (symbol) => {
    if (window.confirm(`Are you sure you want to remove ${symbol} from your portfolio?`)) {
      setAssets(assets.filter(a => a.symbol !== symbol));
    }
  };

  const handleNext = () => {
    if (assets.length === 0) {
      setError('Please add at least one asset to your portfolio');
      return;
    }
    navigate('/timeline');
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Step 1: Portfolio Input
        </h2>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Add assets to your portfolio one by one. Use the search to find and validate ticker symbols from Yahoo Finance.
            You can add unlimited assets.
          </p>
          
          <div className="relative mb-4" ref={resultsRef}>
            <label htmlFor="asset-search" className="block text-sm font-medium text-gray-700 mb-2">
              Search for Assets
            </label>
            <div className="relative">
              <input
                id="asset-search"
                type="text"
                value={searchQuery}
                onChange={handleInputChange}
                placeholder="Type to search (e.g., AAPL, MSFT)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={validating}
              />
              {loading && (
                <div className="absolute right-3 top-2.5">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
            
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.symbol}
                    onClick={() => handleAddAsset(result.symbol)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  >
                    <div className="font-medium text-gray-900">{result.symbol}</div>
                    <div className="text-sm text-gray-500">{result.name}</div>
                  </button>
                ))}
              </div>
            )}
            
            {showResults && searchResults.length === 0 && searchQuery.length >= 2 && !loading && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4 text-center text-gray-500">
                No results found
              </div>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {assets.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">
                Your Portfolio ({assets.length} {assets.length === 1 ? 'asset' : 'assets'})
              </h3>
              <div className="space-y-2">
                {assets.map((asset) => (
                  <div
                    key={asset.symbol}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{asset.symbol}</div>
                      <div className="text-sm text-gray-500">{asset.name}</div>
                    </div>
                    <button
                      onClick={() => handleRemoveAsset(asset.symbol)}
                      className="px-3 py-1 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <button
            onClick={handleBack}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={assets.length === 0 || validating}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Next: Select Timeline
          </button>
        </div>
      </div>
    </div>
  );
};

export default PortfolioInput;



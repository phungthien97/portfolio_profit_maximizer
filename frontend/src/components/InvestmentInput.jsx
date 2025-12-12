import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const InvestmentInput = () => {
  const navigate = useNavigate();
  const { frontier, investmentAmount, setInvestmentAmount, expectedReturn, setExpectedReturn, currency } = useApp();
  const [error, setError] = useState('');

  const handleInvestmentChange = (e) => {
    const value = e.target.value;
    // Only allow whole numbers
    if (value === '' || /^\d+$/.test(value)) {
      setInvestmentAmount(value);
      setError('');
    }
  };

  const handleReturnChange = (e) => {
    const value = e.target.value;
    // Allow decimal numbers
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setExpectedReturn(value);
      setError('');
    }
  };

  const handleNext = () => {
    if (!investmentAmount || investmentAmount === '0') {
      setError('Please enter a valid investment amount');
      return;
    }

    if (!expectedReturn) {
      setError('Please enter an expected return');
      return;
    }

    const returnValue = parseFloat(expectedReturn);
    const amountValue = parseInt(investmentAmount);

    if (isNaN(returnValue) || isNaN(amountValue)) {
      setError('Please enter valid numbers');
      return;
    }

    if (!frontier) {
      setError('Frontier data not available. Please go back and recalculate.');
      return;
    }

    if (returnValue < frontier.minReturn || returnValue > frontier.maxReturn) {
      setError(
        `Expected return must be between ${frontier.minReturn.toFixed(2)}% and ${frontier.maxReturn.toFixed(2)}%`
      );
      return;
    }

    navigate('/allocation');
  };

  const handleBack = () => {
    navigate('/results');
  };

  const handleJumpToPortfolio = () => {
    navigate('/portfolio');
  };

  if (!frontier) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Step 6: Investment Input
          </h2>
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> Efficient frontier data is not available. Please go back to the results page to calculate it first.
            </p>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleBack}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Back to Results
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Step 6: Investment Input
        </h2>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Enter your investment amount and expected return. The expected return must be within the achievable range
            shown below based on your portfolio's efficient frontier.
          </p>

          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Achievable Return Range:</strong> {frontier.minReturn.toFixed(2)}% to {frontier.maxReturn.toFixed(2)}%
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="investment-amount" className="block text-sm font-medium text-gray-700 mb-2">
                Investment Amount (whole numbers only)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">{currency || 'USD'}</span>
                <input
                  id="investment-amount"
                  type="text"
                  value={investmentAmount}
                  onChange={handleInvestmentChange}
                  placeholder="10000"
                  className="w-full pl-12 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="expected-return" className="block text-sm font-medium text-gray-700 mb-2">
                Expected Return (%)
              </label>
              <div className="relative">
                <input
                  id="expected-return"
                  type="text"
                  value={expectedReturn}
                  onChange={handleReturnChange}
                  placeholder="12.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="absolute right-3 top-2 text-gray-500">%</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <div className="flex gap-2">
            <button
              onClick={handleBack}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleJumpToPortfolio}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Change Portfolio
            </button>
          </div>
          <button
            onClick={handleNext}
            disabled={!investmentAmount || !expectedReturn}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Next: View Allocation
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvestmentInput;


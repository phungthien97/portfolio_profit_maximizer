import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useApp } from '../context/AppContext';

const TimelineSelect = () => {
  const navigate = useNavigate();
  const { startDate, setStartDate, endDate, setEndDate, assets } = useApp();
  const [error, setError] = useState('');

  const handleNext = () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    if (startDate >= endDate) {
      setError('Start date must be before end date');
      return;
    }

    // Check if date range is at least 1 year (365 days)
    const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    if (daysDiff < 365) {
      setError('Date range must be at least 1 year (365 days) for accurate analysis. Shorter periods may skew the results.');
      return;
    }

    navigate('/results');
  };

  const handleBack = () => {
    navigate('/portfolio');
  };

  // Calculate if date range is valid (at least 1 year)
  const isValidDateRange = startDate && endDate && startDate < endDate && 
    Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) >= 365;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Step 2: Timeline Selection
        </h2>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-4">
            Select the date range for historical data analysis. This period will be used to calculate annualized returns and risk metrics.
            <span className="font-semibold text-gray-800"> Minimum 1 year required</span> for accurate analysis. Shorter periods may skew the results.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <DatePicker
                id="start-date"
                selected={startDate}
                onChange={(date) => {
                  setStartDate(date);
                  setError('');
                }}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                maxDate={endDate || new Date()}
                dateFormat="yyyy-MM-dd"
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                scrollableYearDropdown
                yearDropdownItemNumber={15}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholderText="Select start date"
              />
            </div>
            
            <div>
              <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <DatePicker
                id="end-date"
                selected={endDate}
                onChange={(date) => {
                  setEndDate(date);
                  setError('');
                }}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate ? (() => {
                  const minEndDate = new Date(startDate);
                  minEndDate.setFullYear(minEndDate.getFullYear() + 1);
                  return minEndDate;
                })() : undefined}
                maxDate={new Date()}
                dateFormat="yyyy-MM-dd"
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                scrollableYearDropdown
                yearDropdownItemNumber={15}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholderText="Select end date (min 1 year from start)"
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {startDate && endDate && (() => {
            const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
            const years = (daysDiff / 365).toFixed(2);
            const isValid = daysDiff >= 365;
            return (
              <div className={`mt-4 p-3 border rounded-md ${isValid ? 'bg-blue-50 border-blue-200' : 'bg-yellow-50 border-yellow-200'}`}>
                <p className={`text-sm ${isValid ? 'text-blue-800' : 'text-yellow-800'}`}>
                  Selected period: {startDate.toLocaleDateString()} to {endDate.toLocaleDateString()} 
                  ({daysDiff} days / {years} years)
                  {!isValid && <span className="block mt-1 font-semibold">⚠️ Minimum 1 year required</span>}
                </p>
              </div>
            );
          })()}
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
            disabled={!isValidDateRange}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Next: View Results
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimelineSelect;



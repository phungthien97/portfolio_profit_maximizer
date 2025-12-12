import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Plot from 'react-plotly.js';
import { useApp } from '../context/AppContext';
import { fetchHistoricalData, calculateMetrics, computeFrontier } from '../services/api';

const ResultsDisplay = () => {
  const navigate = useNavigate();
  const {
    assets,
    startDate,
    endDate,
    currency,
    historicalData,
    setHistoricalData,
    metrics,
    setMetrics,
    frontier,
    setFrontier
  } = useApp();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('basic'); // 'basic' or 'intermediate'
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [missingDataAssets, setMissingDataAssets] = useState([]);
  const [dataFetched, setDataFetched] = useState(false);

  useEffect(() => {
    if (!dataFetched && assets.length > 0 && startDate && endDate) {
      fetchData();
    }
  }, [assets, startDate, endDate, currency]);

  const fetchData = async () => {
    setLoading(true);
    setError('');

    try {
      // Format dates
      const startDateStr = startDate instanceof Date 
        ? startDate.toISOString().split('T')[0]
        : startDate;
      const endDateStr = endDate instanceof Date 
        ? endDate.toISOString().split('T')[0]
        : endDate;
      const assetSymbols = assets.map(a => a.symbol);

      // Fetch historical data
      const dataResponse = await fetchHistoricalData(assetSymbols, startDateStr, endDateStr, currency);
      const fetchedData = dataResponse.data.data;
      setHistoricalData(fetchedData);

      // Check for missing data
      const missing = Object.entries(fetchedData)
        .filter(([symbol, data]) => !data.hasData || data.dataQuality?.hasGaps)
        .map(([symbol]) => symbol);
      setMissingDataAssets(missing);

      // Calculate metrics
      const metricsResponse = await calculateMetrics(fetchedData, assetSymbols, false);
      const calculatedMetrics = metricsResponse.data.metrics;
      setMetrics(calculatedMetrics);

      // Compute efficient frontier
      const frontierResponse = await computeFrontier(calculatedMetrics, fetchedData, assetSymbols);
      setFrontier(frontierResponse.data);

      setDataFetched(true);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch and calculate data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedMetrics = () => {
    if (!metrics || !sortConfig.key) return metrics;

    const sorted = { ...metrics };
    const entries = Object.entries(sorted).sort((a, b) => {
      const aValue = a[1][sortConfig.key];
      const bValue = b[1][sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return Object.fromEntries(entries);
  };

  const handleBack = () => {
    navigate('/timeline');
  };

  const handleNext = () => {
    navigate('/investment');
  };

  const handleJumpToPortfolio = () => {
    navigate('/portfolio');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Fetching data and calculating metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
          <div className="mt-4 flex justify-between">
            <button
              onClick={handleBack}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Back
            </button>
            <button
              onClick={fetchData}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics || !frontier) {
    return null;
  }

  const sorted = sortedMetrics();
  const metricsArray = Object.entries(sorted);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Step 3 & 4: Results & Efficient Frontier
        </h2>

        {missingDataAssets.length > 0 && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800 font-medium mb-2">
              Warning: Some assets have missing or incomplete data:
            </p>
            <ul className="list-disc list-inside text-sm text-yellow-700">
              {missingDataAssets.map(symbol => (
                <li key={symbol}>{symbol}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Metrics Table */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Profit/Risk Metrics</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('basic')}
                className={`px-3 py-1 text-sm rounded-md ${
                  viewMode === 'basic'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Basic
              </button>
              <button
                onClick={() => setViewMode('intermediate')}
                className={`px-3 py-1 text-sm rounded-md ${
                  viewMode === 'intermediate'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Intermediate
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    onClick={() => handleSort('symbol')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Symbol {sortConfig.key === 'symbol' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('return')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Annualized Return (%) {sortConfig.key === 'return' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    onClick={() => handleSort('risk')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Annualized Risk (%) {sortConfig.key === 'risk' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  {viewMode === 'intermediate' && (
                    <>
                      <th
                        onClick={() => handleSort('minPrice')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      >
                        Min Price {sortConfig.key === 'minPrice' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                      <th
                        onClick={() => handleSort('maxPrice')}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      >
                        Max Price {sortConfig.key === 'maxPrice' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {metricsArray.map(([symbol, metric]) => (
                  <tr key={symbol}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {metric.return !== null ? `${metric.return.toFixed(2)}%` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {metric.risk !== null ? `${metric.risk.toFixed(2)}%` : 'N/A'}
                    </td>
                    {viewMode === 'intermediate' && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {metric.minPrice !== null ? `${metric.minPrice.toFixed(2)}` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {metric.maxPrice !== null ? `${metric.maxPrice.toFixed(2)}` : 'N/A'}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Efficient Frontier Graph */}
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Efficient Frontier</h3>
          <p className="text-sm text-gray-600 mb-4">
            The efficient frontier shows the optimal risk-return combinations. Hover over points to see portfolio weights.
            Achievable return range: {frontier.minReturn.toFixed(2)}% to {frontier.maxReturn.toFixed(2)}%
          </p>
          
          {frontier.points && frontier.points.length > 0 && (
            <div className="bg-white p-4 border border-gray-200 rounded-md">
              <Plot
                data={[
                  {
                    x: frontier.points.map(p => p.risk),
                    y: frontier.points.map(p => p.return),
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: 'Efficient Frontier',
                    line: { color: '#3B82F6', width: 2 },
                    marker: { size: 6 },
                    hovertemplate: '<b>Risk:</b> %{x:.2f}%<br><b>Return:</b> %{y:.2f}%<extra></extra>'
                  }
                ]}
                layout={{
                  title: {
                    text: 'Efficient Frontier',
                    font: { size: 18 }
                  },
                  xaxis: {
                    title: {
                      text: 'Risk (%)',
                      font: { size: 14 }
                    },
                    showgrid: true,
                    gridcolor: '#E5E7EB'
                  },
                  yaxis: {
                    title: {
                      text: 'Return (%)',
                      font: { size: 14 }
                    },
                    showgrid: true,
                    gridcolor: '#E5E7EB'
                  },
                  hovermode: 'closest',
                  height: 500,
                  showlegend: true,
                  plot_bgcolor: '#FFFFFF',
                  paper_bgcolor: '#FFFFFF'
                }}
                style={{ width: '100%', height: '500px' }}
                config={{ responsive: true }}
              />
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-between">
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
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Next: Investment Input
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;


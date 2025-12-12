import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Currency endpoints
export const getCurrency = () => api.get('/currency');
export const setCurrency = (currency) => api.post('/currency', { currency });

// Asset endpoints
export const searchAssets = (query) => api.get('/assets/search', { params: { query } });
export const validateAsset = (symbol) => api.get('/assets/validate', { params: { symbol } });

// Data endpoints
export const fetchHistoricalData = (assets, startDate, endDate, currency) =>
  api.post('/data/fetch', { assets, startDate, endDate, currency });

// Calculations endpoints
export const calculateMetrics = (data, assets, interpolateMissing = false, targetCurrency = 'USD') =>
  api.post('/calculations/metrics', { data, assets, interpolateMissing, targetCurrency });

// Optimization endpoints
export const computeFrontier = (metrics, data, assets) =>
  api.post('/optimization/frontier', { metrics, data, assets });

export const computeAllocation = (frontier, expectedReturn, investmentAmount, metrics, data, assets) =>
  api.post('/optimization/allocation', { frontier, expectedReturn, investmentAmount, metrics, data, assets });

export default api;



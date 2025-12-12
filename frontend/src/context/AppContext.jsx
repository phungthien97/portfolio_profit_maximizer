import { createContext, useContext, useState, useCallback } from 'react';

const AppContext = createContext();

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [currency, setCurrency] = useState('USD');
  const [assets, setAssets] = useState([]);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [frontier, setFrontier] = useState(null);
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [expectedReturn, setExpectedReturn] = useState('');
  const [allocation, setAllocation] = useState(null);

  const reset = useCallback(() => {
    setCurrency('USD');
    setAssets([]);
    setStartDate(null);
    setEndDate(null);
    setHistoricalData(null);
    setMetrics(null);
    setFrontier(null);
    setInvestmentAmount('');
    setExpectedReturn('');
    setAllocation(null);
  }, []);

  const value = {
    currency,
    setCurrency,
    assets,
    setAssets,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    historicalData,
    setHistoricalData,
    metrics,
    setMetrics,
    frontier,
    setFrontier,
    investmentAmount,
    setInvestmentAmount,
    expectedReturn,
    setExpectedReturn,
    allocation,
    setAllocation,
    reset
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};



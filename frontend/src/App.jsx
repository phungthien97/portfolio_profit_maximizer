import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import CurrencySelect from './components/CurrencySelect';
import PortfolioInput from './components/PortfolioInput';
import TimelineSelect from './components/TimelineSelect';
import ResultsDisplay from './components/ResultsDisplay';
import InvestmentInput from './components/InvestmentInput';
import AllocationOutput from './components/AllocationOutput';
import Layout from './components/Layout';

function App() {
  return (
    <AppProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<CurrencySelect />} />
            <Route path="/portfolio" element={<PortfolioInput />} />
            <Route path="/timeline" element={<TimelineSelect />} />
            <Route path="/results" element={<ResultsDisplay />} />
            <Route path="/investment" element={<InvestmentInput />} />
            <Route path="/allocation" element={<AllocationOutput />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
  );
}

export default App;

import { useApp } from '../context/AppContext';

const Layout = ({ children }) => {
  const { reset } = useApp();

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset all data? This will clear all your inputs.')) {
      reset();
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              Portfolio Profit Maximizer
            </h1>
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="mt-12 border-t bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Created by <span className="font-semibold text-gray-700">Thien Phung</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;



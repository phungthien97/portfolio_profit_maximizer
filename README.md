# Portfolio Profit Maximizer

A full-stack web application for portfolio optimization using historical data, annualized returns, risk metrics, and the Efficient Frontier framework.

## Features

- **Currency Selection**: Choose USD or CAD for all calculations
- **Portfolio Input**: Add unlimited assets with autocomplete search from Yahoo Finance
- **Timeline Selection**: Select date ranges for historical analysis
- **Profit/Risk Metrics**: Calculate annualized returns and risk with sortable tables
- **Efficient Frontier**: Interactive graph showing optimal risk-return combinations
- **Optimized Allocation**: Get recommended portfolio allocations based on expected return
- **PDF Export**: Generate comprehensive reports

## Tech Stack

### Backend
- Node.js + Express
- Yahoo Finance API (yahoo-finance2)
- Math.js for calculations
- Jest for testing

### Frontend
- React with Vite
- React Router for navigation
- Tailwind CSS for styling
- Plotly.js for interactive graphs
- Chart.js for pie charts
- jsPDF for PDF exports
- React DatePicker for date selection

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (optional, defaults to port 5000):
```
PORT=5000
NODE_ENV=development
```

4. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```
VITE_API_URL=http://localhost:5000
```

4. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173` (or another port if 5173 is taken)

## Running Tests

### Backend Tests
```bash
cd backend
npm test
```

## Project Structure

```
.
├── backend/
│   ├── routes/          # API route handlers
│   ├── tests/           # Test files
│   ├── server.js        # Express server setup
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── context/     # Context API for state
│   │   ├── services/    # API service functions
│   │   └── App.jsx      # Main app component
│   └── package.json
└── README.md
```

## API Endpoints

- `GET /health` - Health check
- `GET /currency` - Get current currency
- `POST /currency` - Set currency
- `GET /assets/search?query=string` - Search for assets
- `GET /assets/validate?symbol=string` - Validate asset symbol
- `POST /data/fetch` - Fetch historical data
- `POST /calculations/metrics` - Calculate metrics
- `POST /optimization/frontier` - Compute efficient frontier
- `POST /optimization/allocation` - Get optimized allocation

## Usage

1. Start both backend and frontend servers
2. Open the frontend URL in your browser
3. Follow the step-by-step wizard:
   - Select currency
   - Add portfolio assets
   - Select timeline
   - View results and efficient frontier
   - Enter investment amount and expected return
   - View optimized allocation and export PDF

## Notes

- The app uses session-based state (no persistence on page refresh)
- Historical data is fetched from Yahoo Finance
- Efficient Frontier uses Monte Carlo simulation (10,000 portfolios)
- All calculations assume 252 trading days per year



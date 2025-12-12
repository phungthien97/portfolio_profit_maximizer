# Portfolio Profit Maximizer

A full-stack web application for portfolio optimization using historical data, annualized returns, risk metrics, and the Efficient Frontier framework. This app helps investors make data-driven decisions to maximize profit while minimizing risk for their stock/ETF portfolios.

**Created by Thien Phung**

## Features

- **Currency Selection**: Choose from 10 popular currencies (USD, EUR, GBP, JPY, CNY, AUD, CAD, CHF, HKD, VND) for all inputs and outputs (default: USD)
- **Portfolio Input**: Add unlimited assets with autocomplete search from Yahoo Finance
  - Inline validation for invalid ticker symbols
  - Confirmation prompt before removing assets
- **Timeline Selection**: Date range picker for selecting historical analysis period
- **Data Retrieval & Metrics**: 
  - Fetch end-of-day historical data from Yahoo Finance
  - Calculate annualized return % and annualized risk % (standard deviation)
  - Display min/max prices for each asset
  - Warning notifications for missing or incomplete data
- **Profit/Risk Table**: 
  - Sortable table with metrics for all assets
  - Basic view: Annualized Return %, Annualized Risk %
  - Intermediate view: Includes min/max prices in the period
- **Efficient Frontier Graph**: 
  - Interactive Plotly.js graph showing the entire feasible portfolio region
  - Efficient frontier curve highlighted
  - Hover interactivity showing exact risk, return, and asset weights
  - Displays min and max achievable returns
- **Investment Input**: 
  - Enter investment amount (whole numbers only)
  - Enter expected return (%) with validation against min-max range
- **Optimized Allocation**: 
  - Recommended portfolio allocation based on expected return
  - Pie chart visualization using Chart.js
  - Detailed table with % and $ allocation per asset
  - Textual explanation of the allocation strategy
- **Portfolio Projection**: 
  - Configurable projection period (1-10 years)
  - Portfolio growth projection graph with confidence bounds
  - Risk projection over time
  - Projected final value and return percentage
- **PDF Export**: 
  - Comprehensive report including all inputs, metrics, graphs, and projections
  - Includes Efficient Frontier, allocation charts, and projection graphs

## Tech Stack

### Backend
- **Node.js + Express**: RESTful API server
- **yahoo-finance2**: Yahoo Finance API integration for asset search and historical data
- **mathjs**: Mathematical operations and matrix calculations
- **numeric**: Numerical computing for optimization
- **quadprog**: Quadratic programming for portfolio optimization
- **Jest + Supertest**: Testing framework

### Frontend
- **React 19**: UI framework with hooks and context API
- **Vite**: Build tool and development server
- **React Router DOM**: Client-side routing and navigation
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **Plotly.js + react-plotly.js**: Interactive graphs (Efficient Frontier, projections)
- **Chart.js + react-chartjs-2**: Pie charts for portfolio allocation
- **jsPDF + html2canvas**: PDF generation with graph exports
- **React DatePicker**: Date range selection component
- **Axios**: HTTP client for API requests

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
│   │   ├── assets.js    # Asset search and validation
│   │   ├── calculations.js  # Metrics calculations
│   │   ├── currency.js  # Currency management
│   │   ├── data.js      # Historical data fetching
│   │   ├── health.js    # Health check endpoint
│   │   └── optimization.js  # Efficient frontier and allocation
│   ├── tests/           # Jest test files
│   ├── server.js        # Express server setup
│   ├── jest.config.js   # Jest configuration
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   │   ├── AllocationOutput.jsx  # Allocation results and PDF export
│   │   │   ├── CurrencySelect.jsx    # Currency selection
│   │   │   ├── InvestmentInput.jsx   # Investment amount and expected return
│   │   │   ├── Layout.jsx            # App layout wrapper
│   │   │   ├── PortfolioInput.jsx    # Asset input with autocomplete
│   │   │   ├── ResultsDisplay.jsx    # Metrics table and Efficient Frontier
│   │   │   └── TimelineSelect.jsx    # Date range picker
│   │   ├── context/
│   │   │   └── AppContext.jsx        # Global state management
│   │   ├── services/
│   │   │   └── api.js                # API client functions
│   │   ├── App.jsx                   # Main app with routing
│   │   └── main.jsx                  # React entry point
│   ├── public/          # Static assets
│   ├── index.html       # HTML template
│   ├── vite.config.js   # Vite configuration
│   ├── tailwind.config.js  # Tailwind CSS configuration
│   └── package.json
├── portfolio_profit_maximizer_spec.md  # Original specification
├── blueprint.md         # Development blueprint
├── todo.md              # Development checklist
└── README.md            # This file
```

## API Endpoints

### Health
- `GET /health` - Health check endpoint

### Currency
- `GET /currency` - Get current currency setting
- `POST /currency` - Set currency (body: `{ currency: "USD" | "EUR" | "GBP" | "JPY" | "CNY" | "AUD" | "CAD" | "CHF" | "HKD" | "VND" }`)

### Assets
- `GET /assets/search?query=string` - Search for assets by ticker symbol or name
- `GET /assets/validate?symbol=string` - Validate if an asset symbol exists

### Data
- `POST /data/fetch` - Fetch historical data
  - Body: `{ assets: string[], startDate: string, endDate: string, currency: string }`
  - Returns: Historical price data with quality indicators

### Calculations
- `POST /calculations/metrics` - Calculate annualized returns and risk metrics
  - Body: `{ data: object, assets: string[], interpolateMissing: boolean }`
  - Returns: Metrics including return %, risk %, min/max prices

### Optimization
- `POST /optimization/frontier` - Compute efficient frontier
  - Body: `{ metrics: object, data: object, assets: string[] }`
  - Returns: Frontier points, min/max returns, portfolio weights
- `POST /optimization/allocation` - Get optimized allocation
  - Body: `{ frontier: object, expectedReturn: number, investmentAmount: number, metrics: object, data: object, assets: string[] }`
  - Returns: Recommended allocation with percentages and dollar amounts

## Usage

1. Start both backend and frontend servers (see Setup Instructions above)
2. Open the frontend URL in your browser (typically `http://localhost:5173`)
3. Follow the step-by-step wizard:
   - **Step 0**: Select currency from 10 popular options (USD, EUR, GBP, JPY, CNY, AUD, CAD, CHF, HKD, VND)
   - **Step 1**: Add portfolio assets using autocomplete search
   - **Step 2**: Select timeline (date range) for historical analysis
   - **Step 3 & 4**: View results including:
     - Sortable profit/risk metrics table
     - Interactive Efficient Frontier graph
   - **Step 5**: Enter investment amount and expected return
   - **Step 6**: View optimized allocation with:
     - Pie chart visualization
     - Detailed allocation table
     - Portfolio projection graphs
     - Export comprehensive PDF report

### Navigation
- Linear flow by default through all steps
- After viewing results, you can jump back to:
  - Step 1: Change portfolio assets
  - Step 5: Adjust investment amount or expected return

## Key Features & Implementation Details

- **Session-based State**: Uses React Context API for state management (no persistence on page refresh)
- **Data Source**: Yahoo Finance API (yahoo-finance2) for end-of-day historical data
- **Efficient Frontier**: Monte Carlo simulation generating 10,000 random portfolios
  - No short selling (weights 0-100%, sum to 100%)
  - Identifies optimal risk-return combinations
- **Calculations**: 
  - Annualized returns using geometric mean
  - Annualized risk (standard deviation) assuming 252 trading days per year
  - Portfolio optimization using quadratic programming
- **Missing Data Handling**: 
  - Warns users about assets with missing or incomplete data
  - Data quality indicators provided
- **Responsive Design**: Fully responsive for desktop, tablet, and mobile devices
- **Error Handling**: Inline validation with clear error messages
- **PDF Export**: Comprehensive reports including all graphs, metrics, and projections

## Deployment

### Backend Deployment (Render.com)

1. **Create a new Web Service** on Render.com:
   - Connect your GitHub repository
   - Select the `backend` directory as the root directory
   - Build command: `npm install`
   - Start command: `npm start`
   - Environment: `Node`

2. **Set Environment Variables** in Render dashboard:
   ```
   PORT=5000 (or leave default - Render sets this automatically)
   NODE_ENV=production
   FRONTEND_URL=https://your-frontend-app.vercel.app
   ```
   Replace `your-frontend-app.vercel.app` with your actual Vercel deployment URL.

3. Render will automatically:
   - Install dependencies
   - Start the server using `npm start`
   - Assign a public URL (e.g., `https://your-backend.onrender.com`)

### Frontend Deployment (Vercel)

1. **Install Vercel CLI** (optional, or use Vercel dashboard):
   ```bash
   npm i -g vercel
   ```

2. **Deploy from the frontend directory**:
   ```bash
   cd frontend
   vercel
   ```
   Or connect your GitHub repository through the Vercel dashboard and set the root directory to `frontend`.

3. **Set Environment Variables** in Vercel dashboard:
   - Go to your project settings → Environment Variables
   - Add: `VITE_API_URL` = `https://your-backend.onrender.com`
   - Replace with your actual Render backend URL

4. **Important**: After setting the environment variable, you need to **redeploy** the frontend for the changes to take effect.

### Post-Deployment Checklist

- [ ] Backend is accessible at the Render URL
- [ ] Frontend environment variable `VITE_API_URL` is set to the backend URL
- [ ] Backend environment variable `FRONTEND_URL` is set to the frontend URL
- [ ] Test the health endpoint: `https://your-backend.onrender.com/health`
- [ ] Test the full application flow from the frontend

### Notes

- **Free Tier Limitations**:
  - Render free tier: Services spin down after 15 minutes of inactivity (cold starts)
  - Vercel free tier: Generous limits for personal projects
  - First request after inactivity may be slow due to cold start on Render

- **CORS Configuration**: The backend is configured to accept requests from the frontend URL specified in `FRONTEND_URL`. In development, it allows all origins.

- **Environment Variables**: Make sure to set environment variables in both platforms before deploying or immediately after the first deployment.



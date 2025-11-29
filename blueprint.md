# Detailed Step-by-Step Blueprint for Building the Portfolio Profit Maximizer Web App

## Overview of Blueprint
This blueprint outlines a comprehensive plan to build the web app based on the provided specification. The app is a full-stack responsive web application using React for the frontend and Node.js/Express for the backend. We'll use Tailwind CSS for styling, Plotly.js for interactive graphs (due to its support for hover interactions and efficiency with financial data), Chart.js for the pie chart, jsPDF for PDF exports, and yahoo-finance2 for data retrieval in Node.js. For portfolio optimization (Efficient Frontier), we'll use a JavaScript library like 'efficient-frontier-js' or implement a basic Monte Carlo simulation with math libraries (e.g., math.js, numeric.js) to approximate the frontier, as a full convex optimization in JS might require custom implementation. To keep it simple and aligned with the spec, we'll assume a Monte Carlo approach for generating the feasible region and identifying the efficient frontier.

The blueprint follows a modular, iterative approach:
- **Backend First**: Build and test API endpoints incrementally, as they handle core computations.
- **Frontend Integration**: Build UI components that consume the backend, with responsive design.
- **Full Flow**: Wire navigation, error handling, and exports.
- **Testing**: Incorporate unit/integration tests at each stage using Jest for backend/frontend.

Key Principles:
- Incremental builds: Start with core data retrieval, add calculations, then optimization, UI, and features.
- Test-Driven: Write tests before/alongside code.
- Responsiveness: Use Tailwind's mobile-first approach.
- No accounts: Session-based via local state (e.g., Redux or Context API in React).

## High-Level Steps
1. **Project Setup**: Initialize repositories, install dependencies, set up linting/testing.
2. **Backend Development**: Endpoints for currency, asset validation, data fetch, calculations, optimization.
3. **Frontend Development**: Components for each user step, forms, tables, charts.
4. **Integration**: Connect frontend to backend, handle data flow.
5. **Features**: Add interactivity, error handling, PDF export.
6. **Testing and Polish**: Full tests, edge cases, responsiveness.

## Detailed Step-by-Step Plan
1. **Setup Backend Project**:
   - Create Node.js/Express app.
   - Install dependencies: express, yahoo-finance2, math.js, numeric.js (for optimizations), cors, dotenv.
   - Set up basic server with health endpoint.
   - Add Jest for testing.

2. **Backend: Currency Handling**:
   - Endpoint to list/set currency (though session-based, use query param or body).
   - Validate supported currencies (e.g., USD, CAD).

3. **Backend: Asset Validation and Data Fetch**:
   - Endpoint to search/validate tickers via Yahoo Finance.
   - Endpoint to fetch historical data for multiple assets over a date range.
   - Handle missing data: Options for interpolation or removal.

4. **Backend: Calculations**:
   - Compute annualized return and risk (std dev).
   - Add min/max prices.
   - Tests for calculations.

5. **Backend: Efficient Frontier**:
   - Implement Monte Carlo simulation to generate portfolio points.
   - Identify efficient frontier, min/max returns.
   - Endpoint to compute frontier data.

6. **Backend: Optimization**:
   - Endpoint for optimized allocation given investment amount and expected return.
   - Use constraints: No shorts, sum to 100%.
   - Return allocations in % and $.

7. **Setup Frontend Project**:
   - Create React app with Vite or CRA.
   - Install dependencies: react-router-dom, tailwindcss, plotly.js, chart.js, react-chartjs-2, jspdf, axios.
   - Set up routing for steps (hybrid navigation).

8. **Frontend: Currency Selection**:
   - Component for dropdown, store in context/state.

9. **Frontend: Portfolio Input**:
   - Form with autocomplete search (fetch from backend).
   - Add/remove assets with confirmations.

10. **Frontend: Timeline Selection**:
    - Date range picker (use react-datepicker).

11. **Frontend: Table Display**:
    - Sortable table for metrics.
    - Toggle basic/intermediate views.

12. **Frontend: Efficient Frontier Graph**:
    - Interactive Plotly graph with hover, highlight user portfolio.

13. **Frontend: Investment Input**:
    - Form for amount and return, with validation against min/max.

14. **Frontend: Allocation Output**:
    - Pie chart (Chart.js), table.
    - Text explanation.
    - PDF export button.

15. **Frontend: Guidance and Navigation**:
    - Add tooltips, instructions.
    - Linear/jump navigation.
    - Reset confirmation.

16. **Error Handling**:
    - Inline messages, prompts.

17. **Integration and Testing**:
    - Full data flow tests.
    - Edge cases.

18. **Deployment Prep**:
    - Environment vars, CORS.
    - Build scripts.

# Iterative Breakdown into Chunks
Starting from the high-level plan, break into chunks that build iteratively:

**Chunk 1: Backend Setup and Basic Endpoints**
- Setup server, health check, currency endpoint.

**Chunk 2: Backend Asset Handling**
- Ticker validation, historical data fetch.

**Chunk 3: Backend Calculations**
- Annualized metrics, missing data handling.

**Chunk 4: Backend Optimization**
- Efficient frontier, allocation optimization.

**Chunk 5: Frontend Setup and Core Components**
- App structure, currency, portfolio input.

**Chunk 6: Frontend Middle Steps**
- Timeline, table, graph.

**Chunk 7: Frontend End Steps**
- Investment input, allocation output, PDF.

**Chunk 8: Full Integration and Features**
- Navigation, errors, guidance.

Refine into smaller steps:
- Ensure each is 1-2 features, testable.
- E.g., Chunk 1 -> Step 1a: Init server; 1b: Add tests; 1c: Currency endpoint.

After iteration: Steps are now right-sized (e.g., one endpoint/component per prompt, with tests).

# Series of Prompts for Code-Generation LLM
Below is a series of standalone prompts, each in code tags. Each prompt instructs the LLM to generate code for a specific step in a test-driven manner, building incrementally. They assume a cumulative codebase (e.g., add to existing files). Prompts cover the entire project without orphans, ending with integration. I've shortened them for conciseness while ensuring completeness.

```prompt
Implement the backend setup for the Portfolio Profit Maximizer app using Node.js and Express. Create a new project directory, install dependencies: express, yahoo-finance2, math.js, numeric.js, cors, dotenv, jest, supertest. Set up an Express server listening on port 5000 with CORS enabled. Add a health check endpoint at GET /health that returns { status: 'ok' }. Write Jest unit tests for the endpoint. Use environment variables for port. Ensure code follows best practices: modular structure, error handling. Output all code files.
```

```prompt
Add currency handling to the existing backend. Create an endpoint POST /currency that accepts { currency: string } (e.g., 'USD'), validates it's supported (USD, CAD), and returns the set currency. Store it in a simple in-memory object for session simulation (use req.session if adding express-session, but keep simple). Add GET /currency to retrieve it, default to 'USD'. Write tests for validation, setting, and getting. Handle errors with 400 status. Integrate with existing server.
```

```prompt
Implement asset validation and search in the backend. Add endpoint GET /assets/search?query=string that uses yahoo-finance2 to search for tickers matching the query, returns array of { symbol, name }. Add validation: GET /assets/validate?symbol=string that checks if symbol is valid via Yahoo. Write tests for successful/failed searches and validations. Handle API errors gracefully. Integrate into existing app.
```

```prompt
Add historical data fetching to the backend. Create POST /data/fetch with body { assets: array of strings, startDate: string (YYYY-MM-DD), endDate: string, currency: string }. Use yahoo-finance2 to fetch end-of-day data. Handle missing data by returning flagged assets. Return structured data: { asset: { dates, prices } }. Add tests for fetch, including partial data cases. Integrate error handling.
```

```prompt
Implement calculations for annualized return and risk in the backend. Add POST /calculations/metrics with body { data: from previous fetch, assets: array }. Compute annualized return % (geometric mean) and risk % (annualized std dev, assuming 252 trading days). Include min/max prices. Handle interpolation for missing data if chosen (add option in body). Return { asset: { return, risk, minPrice, maxPrice } }. Write unit tests for calculations using sample data. Integrate endpoint.
```

```prompt
Add Efficient Frontier computation to the backend. Use Monte Carlo: Generate 10000 random portfolios (weights sum to 1, no shorts), compute portfolio return/risk using previous metrics. Identify frontier points (max return for each risk level). Add POST /optimization/frontier with body { metrics: from calculations }. Return { points: array of { risk, return, weights }, minReturn, maxReturn }. Use math.js/numeric.js for math. Test with sample portfolios.
```

```prompt
Implement optimized allocation in the backend. Add POST /optimization/allocation with body { frontier: from previous, expectedReturn: number, investmentAmount: number }. Find point on frontier closest to expectedReturn with min risk. Scale weights to $ amounts. Return { allocations: { asset: { percent, amount } }, explanation: string }. Validate return in min-max. Tests for optimization logic.
```

```prompt
Set up the frontend React app. Use Vite to create a React project. Install dependencies: react-router-dom, tailwindcss (configure), axios, plotly.js, react-plotly.js, chart.js, react-chartjs-2, jspdf, react-datepicker. Set up basic App with routing: routes for / (currency), /portfolio, /timeline, /results, /investment, /allocation. Use Context API for state (currency, assets, etc.). Add Tailwind for responsive design. Write snapshot tests with Jest/RTL.
```

```prompt
Implement Currency Selection component in frontend. Create CurrencySelect.tsx: Dropdown for USD/CAD, on change axios POST to /currency, store in context. Default USD. Add to / route. Include instructions tooltip. Test component rendering and change event.
```

```prompt
Add Portfolio Input component. Create PortfolioInput.tsx: Input with autocomplete (axios GET /assets/search), add button validates via /assets/validate, add to assets array in context. Remove button with confirmation prompt. Render list of added assets. Inline errors. Integrate into /portfolio route. Tests for add/remove, validation.
```

```prompt
Implement Timeline Selection. Create TimelineSelect.tsx: react-datepicker for range, store in context. Validate dates. Add to /timeline route. Instructions on historical data. Tests for selection.
```

```prompt
Add Profit/Risk Table Display. Create MetricsTable.tsx: After timeline, axios POST /data/fetch then /calculations/metrics. Render sortable table (use react-table) with columns: symbol, return, risk, min/max (toggle view). Responsive. Add to /results route. Tests for sorting, rendering.
```

```prompt
Implement Efficient Frontier Graph. Create FrontierGraph.tsx: After metrics, axios POST /optimization/frontier. Use Plotly to plot points, highlight frontier, user portfolio (average weights). Hover shows risk/return/weights. Show min/max. Interactive, responsive. Add to /results. Tests for graph render.
```

```prompt
Add Investment Input. Create InvestmentInput.tsx: Form for amount (whole number), expectedReturn (%). Validate against min/max from frontier (in context). Inline errors. Axios to backend if needed. Add to /investment route. Tests for validation.
```

```prompt
Implement Optimized Allocation Output. Create AllocationOutput.tsx: Axios POST /optimization/allocation with inputs. Render Chart.js pie chart for %, table for %/$. Short explanation. Add PDF export button using jsPDF: compile all steps into PDF (inputs, table, graph screenshot if possible, allocations). Add to /allocation route. Tests for render, export.
```

```prompt
Add User Guidance and Error Handling. Throughout components, add tooltips/explanations (e.g., what is risk). Inline validation messages. Confirmation prompts for remove/reset (add reset button clearing context). Handle API errors with messages.
```

```prompt
Implement Navigation and Full Integration. Use react-router for hybrid: Linear buttons (next/prev), after /results allow jumps to /portfolio or /investment. Wire context state across: After each step, navigate next or fetch data. Ensure responsive (Tailwind classes). Test full flow: Simulate user journey with integration tests.
```

```prompt
Add Comprehensive Testing. Write integration tests for backend endpoints chain (e.g., fetch -> calc -> optimize). Frontend e2e with Cypress or RTL: Full user flow, edge cases (1 asset, missing data, invalid return). Unit tests for calculations, optimizations. Cover responsiveness, PDF export. Ensure no data persistence on refresh.

# TODO Checklist for Portfolio Profit Maximizer Web App

This checklist is derived directly from the provided specification (portfolio_profit_maximizer_spec.md). It breaks down all requirements into actionable tasks for development, testing, and verification. Use Markdown checkboxes (`- [ ]`) to track progress. Tasks are organized by spec sections for thorough coverage.

## 1. Overview
- [ ] Implement app goal: Data-driven decisions for maximizing profit/minimizing risk using historical data, annualized returns, risk metrics, and Efficient Frontier.
- [ ] Target users: Support features suitable for beginner, intermediate, and advanced investors.
- [ ] Platform: Ensure fully responsive design for desktop, tablet, and mobile.
- [ ] Theme: Implement light mode only.
- [ ] Languages: Support English only.
- [ ] Accounts: No user accounts; use anonymous session-based functionality (e.g., local state, no persistence).

## 2. User Flow / Features

### Step 0 – Currency Selection
- [ ] Allow user to choose currency (e.g., USD, CAD) for all inputs/outputs.
- [ ] Set default currency to USD.

### Step 1 – Portfolio Input
- [ ] Enable adding assets one by one.
- [ ] Implement autocomplete search from Yahoo Finance for ticker validation.
- [ ] Support unlimited number of assets.
- [ ] Add inline validation for invalid symbols.
- [ ] Allow removing an asset with immediate final changes.
- [ ] Include confirmation prompt before removing an asset.

### Step 2 – Timeline Selection
- [ ] Provide a date range picker for selecting historical period.

### Step 3 – Data Retrieval and Calculation
- [ ] Fetch end-of-day historical data from Yahoo Finance.
- [ ] Calculate annualized profit % and annualized risk % (standard deviation).
- [ ] Notify user of missing/incomplete data with options:
  - [ ] Option 1: Fill missing data via interpolation or last available value.
  - [ ] Option 2: Remove the asset from analysis.
- [ ] Use fixed calculation settings (no user adjustments for annualization or risk methods).

### Step 4 – Profit/Risk Table Display
- [ ] Display results in a sortable table.
- [ ] Allow user to choose metrics:
  - [ ] Basic: Annualized Return %, Annualized Risk %.
  - [ ] Intermediate: Include min/max prices in the period.
- [ ] Implement inline validation for invalid inputs/edge cases.

### Step 5 – Efficient Frontier Graph
- [ ] Create interactive graph showing entire feasible portfolio region.
- [ ] Highlight Efficient Frontier curve.
- [ ] Highlight user’s current portfolio on the curve.
- [ ] Add hover interactivity: Show exact risk, return, and asset weights for any point.
- [ ] Display min and max achievable return for the portfolio.

### Step 6 – Investment Input
- [ ] Allow input for investment amount (whole numbers only).
- [ ] Allow input for expected return (%).
- [ ] Validate inputs are within min–max return from Step 5; show inline error if not.
- [ ] Enforce basic constraints:
  - [ ] No short selling (0–100% per asset).
  - [ ] Total allocation sums to 100%.

### Step 7 – Optimized Allocation Output
- [ ] Display recommended portfolio allocation:
  - [ ] Pie chart.
  - [ ] Table with % and $ allocation per asset.
- [ ] Provide short textual explanation of why allocation minimizes risk for requested return.
- [ ] Add summary button for compiling all inputs/outputs into PDF export.

## 3. User Guidance
- [ ] Provide high guidance throughout:
  - [ ] Step-by-step instructions.
  - [ ] Short explanations of concepts/theory at each step (e.g., risk, annualization, Efficient Frontier).
- [ ] Include confirmation prompts for:
  - [ ] Resetting all inputs.
  - [ ] Removing an asset.

## 4. Navigation
- [ ] Implement hybrid navigation:
  - [ ] Linear flow by default.
  - [ ] After Step 5, allow jumping back to Step 1 (change portfolio) or Step 6 (change investment amount/expected return).

## 5. Data Handling
- [ ] Use Yahoo Finance API for end-of-day data only.
- [ ] Implement data checks: Validate ticker symbols, handle missing data as per Step 3.
- [ ] Apply annualization automatically for return and risk.
- [ ] Use user-selected currency from session start.

## 6. UI/UX Requirements
- [ ] Ensure clean, responsive design for desktop, tablet, and mobile.
- [ ] Add interactive elements: Graph hover, tooltips, charts, touch-friendly.
- [ ] Implement pie chart + table visualization for allocations.
- [ ] Add basic sorting on tables (by profit, risk, symbol).
- [ ] No local/session saving; page refresh clears all data.
- [ ] Implement inline validation for all errors.

## 7. Error Handling Strategy
- [ ] Provide inline validation for:
  - [ ] Invalid ticker symbols.
  - [ ] Out-of-range expected return.
  - [ ] Missing data handling choices.
- [ ] Display clear messages explaining problems and user options.
- [ ] Include confirmation prompts for destructive actions.

## 8. Architecture & Tech Stack Recommendations
- [ ] Frontend:
  - [ ] Use React (or Vue/Angular).
  - [ ] Charts: D3.js, Chart.js, or Plotly for interactive graphs.
  - [ ] UI Components: Tailwind CSS or Material-UI.
  - [ ] PDF Export: jsPDF or similar.
- [ ] Backend:
  - [ ] Use Node.js + Express (or Python/Flask).
  - [ ] Yahoo Finance API wrapper (yfinance for Python, or custom Node.js fetch).
  - [ ] Compute annualized returns, risk, and portfolio optimization (Efficient Frontier).
  - [ ] Portfolio optimization library: Python cvxpy / PyPortfolioOpt or JS equivalent.
- [ ] Data Flow:
  - [ ] Frontend sends assets + date range to backend.
  - [ ] Backend fetches historical data.
  - [ ] Backend computes annualized profit %, risk, min/max, and Efficient Frontier.
  - [ ] Backend returns processed data to frontend.
  - [ ] Frontend renders table, graphs, and allocation recommendations.

## 9. Testing Plan

### Unit Tests
- [ ] Test ticker symbol validation.
- [ ] Test data retrieval handling (missing data, invalid symbols).
- [ ] Test annualized return & risk calculations.
- [ ] Test Efficient Frontier optimization output.

### Integration Tests
- [ ] Test full flow: Portfolio input → Efficient Frontier → final allocation.
- [ ] Test PDF export functionality.
- [ ] Test date range picker integration.

### UI/UX Tests
- [ ] Test responsive layout on desktop, tablet, mobile.
- [ ] Test hover interactions and tooltips.
- [ ] Test inline validation messages.
- [ ] Test confirmation prompts behavior.

### Edge Cases
- [ ] Test portfolio with 1 asset.
- [ ] Test portfolio with many assets.
- [ ] Test expected return at min/max.
- [ ] Test assets with partial or missing historical data.
- [ ] Test page refresh mid-session (ensure data loss as expected).

## 10. Deliverables for Developer
- [ ] Deliver fully interactive responsive web app as per spec.
- [ ] Deliver backend services for data retrieval, computation, and optimization.
- [ ] Deliver frontend with all required tables, charts, interactivity, and PDF export.
- [ ] Implement inline validation and confirmation prompts.
- [ ] Provide comprehensive test suite covering calculations, interactions, and edge cases.

## Additional TODOs (General Project Management)
- [ ] Set up version control (e.g., Git repository).
- [ ] Configure development environment (e.g., linting, formatting).
- [ ] Document code and architecture.
- [ ] Perform code reviews at key milestones.
- [ ] Deploy to a staging environment for final testing.
- [ ] Verify compliance with all spec requirements before final handover.
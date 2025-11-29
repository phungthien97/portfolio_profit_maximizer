# Portfolio Profit Maximizer Web App Specification

## 1. Overview

**App Goal:** Help users make data-driven decisions to maximize profit while minimizing risk for their stock/ETF portfolio using historical data, annualized returns, risk metrics, and the Efficient Frontier framework.

**Target Users:** Beginner, intermediate, and advanced investors interested in portfolio optimization.

**Platform:** Responsive web app (desktop, tablet, mobile)  
**Theme:** Light mode only  
**Languages:** English  
**Accounts:** None (anonymous session-based)

---

## 2. User Flow / Features

### Step 0 – Currency Selection
- User chooses the currency for all inputs and outputs (e.g., USD, CAD).
- Default currency can be USD.

### Step 1 – Portfolio Input
- Users add assets **one by one**.
- Asset input includes **autocomplete search** from Yahoo Finance to validate tickers.
- Unlimited number of assets.
- **Inline validation** for invalid symbols.
- Users can remove an asset; changes are **final immediately**.
- **Confirmation prompt** before removing an asset.

### Step 2 – Timeline Selection
- User selects **date range** via a date range picker.
- Timeline determines historical period used for calculations.

### Step 3 – Data Retrieval and Calculation
- Pull **end-of-day historical data** from Yahoo Finance.
- Calculate **annualized profit %** and **annualized risk % (standard deviation)**.
- Notify user if there is **missing/incomplete data**, with options:
  1. Fill missing data via interpolation or last available value.
  2. Remove the asset from analysis.
- **Fixed calculation settings** (no user adjustments for annualization or risk methods).

### Step 4 – Profit/Risk Table Display
- Display results in a **sortable table**.
- User can choose **metrics**:
  - Basic: Annualized Return %, Annualized Risk %
  - Intermediate: Also include min/max prices in the period.
- **Inline validation** for invalid inputs/edge cases.

### Step 5 – Efficient Frontier Graph
- Interactive graph showing the **entire feasible portfolio region**.
- **Efficient frontier curve** highlighted.
- User’s current portfolio **highlighted on the curve**.
- **Hover interactivity:** Show exact risk, return, and asset weights for any point on the frontier.
- Show **min and max achievable return** for the portfolio.

### Step 6 – Investment Input
- User enters:
  - **Investment amount (whole numbers only)**
  - **Expected return (%)**
- Must be within min–max return determined in Step 5; otherwise, **inline error message** explaining the issue.
- **Basic constraints** on allocation:
  - No short selling (0–100% per asset)
  - Total allocation sums to 100%

### Step 7 – Optimized Allocation Output
- Display **recommended portfolio allocation**:
  - **Pie chart**
  - **Table** with % and $ allocation per asset
- **Short textual explanation** of why this allocation minimizes risk for the requested return.
- **Summary button**: Compiles all inputs and outputs into a **PDF export option**.

---

## 3. User Guidance

- **High guidance throughout:**
  - Step-by-step instructions.
  - Short explanations of concepts/theory at each step (e.g., risk, annualization, Efficient Frontier).
- **Confirmation prompts** for:
  - Resetting all inputs
  - Removing an asset

---

## 4. Navigation

- **Hybrid navigation**:
  - Linear flow by default
  - After Step 5, users can jump back to Step 1 (change portfolio) or Step 6 (change investment amount/expected return).

---

## 5. Data Handling

- **Source:** Yahoo Finance API (end-of-day data only)
- **Data checks:** Validate ticker symbols, handle missing data as per Step 3.
- **Annualization:** Automatically applied for return and risk.
- **Currency:** User-selected at session start.

---

## 6. UI/UX Requirements

- Clean, **responsive design** for desktop, tablet, and mobile.
- **Interactive elements:** Graph hover, tooltips, charts, touch-friendly.
- Pie chart + table visualization for allocations.
- Basic sorting on tables (profit, risk, symbol).
- **No local/session saving**; page refresh clears all data.
- Inline validation for all errors.

---

## 7. Error Handling Strategy

- Inline validation for:
  - Invalid ticker symbols
  - Out-of-range expected return
  - Missing data handling choices
- Clear messages explaining the problem and options for the user.
- Confirmation prompts for destructive actions.

---

## 8. Architecture & Tech Stack Recommendations

**Frontend:**
- Framework: React (or Vue/Angular)
- Charts: D3.js, Chart.js, or Plotly for interactive graphs
- UI Components: Tailwind CSS or Material-UI
- PDF Export: jsPDF or similar

**Backend:**
- Node.js + Express (or Python/Flask)
- Yahoo Finance API wrapper (yfinance for Python, or custom Node.js fetch)
- Compute annualized returns, risk, and portfolio optimization (Efficient Frontier)
- Portfolio optimization library: Python `cvxpy` / `PyPortfolioOpt` or JS equivalent

**Data Flow:**
1. Frontend sends assets + date range to backend.
2. Backend fetches historical data.
3. Backend computes annualized profit %, risk, min/max, and Efficient Frontier.
4. Backend returns processed data to frontend.
5. Frontend renders table, graphs, and allocation recommendations.

---

## 9. Testing Plan

### Unit Tests
- Ticker symbol validation
- Data retrieval handling (missing data, invalid symbols)
- Annualized return & risk calculations
- Efficient Frontier optimization output

### Integration Tests
- Full flow from portfolio input → Efficient Frontier → final allocation
- PDF export functionality
- Date range picker integration

### UI/UX Tests
- Responsive layout on desktop, tablet, mobile
- Hover interactions and tooltips
- Inline validation messages
- Confirmation prompts behavior

### Edge Cases
- Portfolio with 1 asset
- Portfolio with many assets
- Expected return at min/max
- Assets with partial or missing historical data
- Refresh page mid-session (ensure data loss as expected)

---

## 10. Deliverables for Developer

1. Fully interactive **responsive web app** as per above spec.
2. Backend services for data retrieval, computation, and optimization.
3. Frontend with all required tables, charts, interactivity, and PDF export.
4. Inline validation and confirmation prompts.
5. Comprehensive **test suite** covering calculations, interactions, and edge cases.
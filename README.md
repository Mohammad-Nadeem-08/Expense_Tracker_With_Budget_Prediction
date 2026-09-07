# Smart Expense & Budget Forecasting System

A full-stack, production-grade expense tracking and predictive financial management system. This application allows users to record their expenses, set category and overall budgets, and uses three distinct machine learning / algorithmic methods to forecast future spending and assess budget risks.

## Key Features

- **Authentication & Security:** Secure signup/login with JWT and bcrypt. All queries are strictly scoped to the authenticated user.
- **Expense Tracking:** Granular logging with amounts, categories, payment methods, and descriptions. Includes search and filtering capabilities.
- **Budget Management:** Create monthly overall and category-specific budgets with real-time utilization progress tracking.
- **Smart Forecasting & Risk Assessment:**
  - *Linear Regression:* Predicts next month's spending based on purely historical monthly totals.
  - *Random Forest Regression:* A feature-based ML model that takes into account rolling averages, transaction counts, active categories, and budget utilization.
  - *Rank-based Spending Risk Analysis:* A deterministic algorithm calculating a normalized risk score (0-100) per category using utilization rates, spending trends, and contribution share.
- **Intelligent Dashboard:** Unified intelligence hub displaying safe daily spending recommendations, projected budget overspending alerts, and ranked category risks.

## Tech Stack

- **Frontend:** React + Vite, React Router, Context API, Axios.
- **Backend:** Node.js, Express, Mongoose, MongoDB.
- **ML Service:** Python, FastAPI, Scikit-Learn, Pandas/Numpy.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   React + Vite Client                    │
│  (Dashboard, Expenses, Budgets, Unified Prediction UI)   │
└────────────────────────────┬─────────────────────────────┘
                             │ HTTP (REST + JWT Auth)
┌────────────────────────────▼─────────────────────────────┐
│                 Node.js + Express Backend                │
│  (Auth, Expense API, Budget API, Unified Prediction API) │
└─────────────┬──────────────────────────────┬─────────────┘
              │ MongoDB Mongoose             │ HTTP REST
┌─────────────▼──────────────┐  ┌────────────▼──────────────┐
│       MongoDB Database      │  │   Python FastAPI ML Svc   │
│  (Users, Expenses, Budgets)│  │ (Linear, RF, Risk Rank)   │
└────────────────────────────┘  └───────────────────────────┘
```

## Setup Instructions

### Prerequisites
- Node.js (v16+)
- Python 3.10+
- MongoDB instance (local or Atlas)

### 1. Database & Backend Setup
Navigate to the `server/` directory:
```bash
cd server
npm install
```
Create a `.env` file in the `server/` directory:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/expense_tracker
JWT_SECRET=your_super_secret_key_here
ML_SERVICE_URL=http://127.0.0.1:8000
```
Start the server:
```bash
npm run dev
```

### 2. ML Service Setup
Navigate to the `ml-service/` directory:
```bash
cd ml-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```
Start the FastAPI server:
```bash
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup
Navigate to the `client/` directory:
```bash
cd client
npm install
```
Start the development server:
```bash
npm run dev
```

## Prediction Methodology Details

The system employs **two** Machine Learning approaches and **one** deterministic algorithmic approach to provide comprehensive financial insights.

1. **Linear Regression (ML):**
   - Simple time-series forecast fitting a line to `(Month_Index, Total_Spending)`. Good for spotting basic long-term upwards/downwards trends.
2. **Random Forest Regression (ML):**
   - Non-linear ensemble model. We engineer features from the historical data (previous month spend, transaction count, category count, budget utilization) to predict the next month's total spend.
   - The final forecast provided to the user is an **Ensemble Average** of the Linear and RF models.
3. **Rank-based Spending Risk Analysis (Non-ML Algorithm):**
   - Calculates a risk score `(0-100)` for each category using a weighted sum of:
     - Budget Utilization (35%)
     - Spending Share (25%)
     - Transaction Frequency (15%)
     - Trend / MoM Growth (25% - inferred via total volume).
   - Generates actionable explanations ("High budget utilization", "Large share of spending").

## Future Improvements

- Full test coverage with Jest and PyTest.
- Docker compose integration for 1-click running.
- Exporting reports to PDF / CSV.
- Advanced visualizations (e.g. Sankey diagrams).

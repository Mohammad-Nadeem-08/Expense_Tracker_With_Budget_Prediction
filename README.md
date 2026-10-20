# Expense Tracker with Budget Prediction

A full-stack expense tracking application that lets users securely record expenses, manage monthly budgets, and forecast the next month’s spending using three statistical forecasting methods. The prediction calculations run directly in the Node.js backend; a separate Python/ML service is not required.

## Features

- **Authentication:** Signup/login with JWT and bcrypt.
- **Expense tracking:** Record and review expenses by amount, category, date, payment method, and description.
- **Budget management:** Create monthly overall and category budgets.
- **Expense prediction:** Shows three separate forecasts and their combined result:
  1. **Moving Average:** Mean of up to the last three calendar months.
  2. **Weighted Moving Average:** Applies weights 20%, 30%, and 50% to the oldest through most recent of the last three months. If fewer months are available, the selected weights are normalized.
  3. **Simple Exponential Smoothing:** Uses alpha = 0.5 and initializes the level from the first observed month.
- **Final combined prediction:** Arithmetic mean of the three method results.
- **Forecast validation:** Expanding-window, one-month-ahead walk-forward holdout metrics for MAE, RMSE, MAPE and bias. At least 12 months are used before the first holdout; zero-spend actuals are omitted from MAPE.
- **Budget comparison:** Compares the final prediction with the target month’s overall budget when one exists.
- **User privacy:** Expense and budget queries are scoped to the authenticated user.

## Tech Stack

- **Frontend:** React, Vite, React Router, Axios
- **Backend:** Node.js, Express, Mongoose
- **Database:** MongoDB / MongoDB Atlas
- **Forecasting:** JavaScript statistical calculations in the Express backend

## Project Structure

```text
client/   React frontend
server/   Express API, authentication, MongoDB models, forecasting methods
```

## Run Locally

### 1. Backend and database

Install Node.js and have a MongoDB database available (MongoDB Atlas is supported). In `server/`, create a `.env` file with your own values:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
```

Do not commit or share the `.env` file. Then run:

```bash
cd server
npm install
npm run dev
```

The backend health endpoint is `http://localhost:5000/api/health`.

### Seed a local demo account with two years of data

The sample data is synthetic. It contains 24 complete months of expenses (six category transactions per month), plus budgets for the forecast month. It ends with the last completed calendar month at the time the script runs.

From `server/`, run `npm run demo:forecast` to create `server/data/demo-expenses.csv` and `server/data/demo-forecast.json` and print the forecast and walk-forward accuracy scores. This preview does not need MongoDB.

To create or refresh the database-backed demo account, configure `MONGODB_URI` and `JWT_SECRET` in `server/.env`, then run `npm run seed:demo`. The email defaults to `demo@smartspend.local`; the script generates a strong one-time password and prints it after a successful seed. Set `DEMO_EMAIL` or `DEMO_PASSWORD` before running if you want to choose them. The script replaces expenses and budgets only for that demo email, and refuses to run when `NODE_ENV=production`.

### 2. Frontend

Open a second terminal and run:

```bash
cd client
npm install
npm run dev
```

Open the local URL printed by Vite. Keep the backend running while using backend-connected features.

## Quality checks

Run these from the matching project folder:

```bash
# Frontend
cd client
npm run lint
npm run build
npm audit

# Backend
cd ../server
npm test
npm run test:coverage
npm audit
```

The backend test command prints line, branch, and function coverage. `npm run test:coverage` also writes `server/coverage/lcov.info` for SonarQube. Tests stub database model calls, so they do not require a running MongoDB instance. The suite covers API controller success and error paths, ownership checks, forecast formulas, backtest metrics and the synthetic data generator. SonarQube coverage is limited to the backend modules exercised by this unit suite; frontend files are analyzed for code quality but are excluded from coverage calculation.

Update dependencies with `npm audit fix` in the affected package folder, then rerun its audit and the checks above. Review package changes before committing them.

To run the local k6 performance check after starting the API, use `k6 run server/performance/smartspend.k6.js`. Set `API_BASE_URL` if the API uses another address and set `DEMO_TOKEN` to include authenticated forecast requests. The script checks failure rate and the 95th-percentile response time under a small ramp-up load.

## Forecast Notes

- Expenses are grouped into calendar-month totals. Months with no transactions between the first and latest recorded month are included as zero.
- The next forecast month is the calendar month after the latest month containing an expense.
- The final result is `(Moving Average + Weighted Moving Average + Exponential Smoothing) / 3`.
- Walk-forward validation scores each held-out month using only earlier months, which avoids training on the value being evaluated. The demo data provides 12 holdout months after the initial year of history.
- Demo forecasts and accuracy metrics show that the application works end-to-end with example data; they are not evidence of accuracy on a real person's spending.
- These methods are statistical forecasts, not machine-learning models, and their output should be treated as an estimate rather than a guarantee.

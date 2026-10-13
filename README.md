# Expense Tracker with Budget Prediction

A full-stack expense tracking application that lets users securely record expenses, manage monthly budgets, and forecast the next month’s spending using three statistical forecasting methods. The prediction calculations run directly in the Node.js backend; a separate Python/ML service is not required.

## Features

- **Authentication:** Signup/login with JWT and bcrypt.
- **Expense tracking:** Record and review expenses by amount, category, date, payment method, and description.
- **Budget management:** Create monthly overall and category budgets.
- **Expense prediction:** Shows three separate forecasts and their combined result:
  1. **Moving Average:** Mean of up to the last three calendar months.
  2. **Weighted Moving Average:** Applies weights 20%, 30%, and 50% to the oldest through most recent of the last three months. If fewer months are available, the selected weights are normalized.
  4. **Simple Exponential Smoothing:** Uses alpha = 0.5 and initializes the level from the first observed month.
- **Final combined prediction:** Arithmetic mean of the three method results.
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

### 2. Frontend

Open a second terminal and run:

```bash
cd client
npm install
npm run dev
```

Open the local URL printed by Vite. Keep the backend running while using backend-connected features.

## Forecast Notes

- Expenses are grouped into calendar-month totals. Months with no transactions between the first and latest recorded month are included as zero.
- The next forecast month is the calendar month after the latest month containing an expense.
- The final result is `(Moving Average + Weighted Moving Average + Exponential Smoothing) / 3`.
- These methods are statistical forecasts, not machine-learning models, and their output should be treated as an estimate rather than a guarantee.

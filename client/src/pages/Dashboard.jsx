import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import {
  IconPlus,
  IconExpenses,
  IconBudgets,
  IconCheck,
  IconAlert,
  IconInfo,
  IconArrowRight,
  IconTrendingUp,
} from "../components/Icons";
import "../App.css";

const EXPENSE_API = "http://localhost:5000/api/expenses";
const BUDGET_API = "http://localhost:5000/api/budgets";
const PREDICTION_API = "http://localhost:5000/api/prediction";

const authConfig = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

function Dashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [prediction, setPrediction] = useState(null);

  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const getMonthName = (month) =>
    new Date(2000, month - 1, 1).toLocaleString("default", { month: "long" });

  const formatCurrency = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const fetchExpenses = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(EXPENSE_API, authConfig(token));
      setExpenses(response.data.data || response.data);
    } catch (error) {
      console.error("Failed to load expenses:", error);
    } finally {
      setLoadingExpenses(false);
    }
  }, [token]);

  const fetchSummary = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(
        `${BUDGET_API}/summary/${selectedMonth}/${selectedYear}`,
        authConfig(token)
      );
      setSummary(response.data.data || response.data);
    } catch (error) {
      console.error("Failed to load dashboard summary:", error);
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [selectedMonth, selectedYear, token]);

  const fetchPrediction = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(PREDICTION_API, authConfig(token));
      setPrediction(response.data);
    } catch (error) {
      console.error("Failed to load prediction data:", error);
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    queueMicrotask(() => {
      void fetchExpenses();
      void fetchPrediction();
    });
  }, [fetchExpenses, fetchPrediction, token]);

  useEffect(() => {
    if (token) queueMicrotask(() => { void fetchSummary(); });
  }, [fetchSummary, token]);

  const currentMonthExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const date = new Date(expense.date);
      return date.getMonth() + 1 === selectedMonth && date.getFullYear() === selectedYear;
    });
  }, [expenses, selectedMonth, selectedYear]);

  const overall = summary?.overall || { budget: 0, spent: 0, remaining: 0 };
  const usage = overall.budget > 0 ? Math.min((overall.spent / overall.budget) * 100, 100) : 0;

  // Recommendations Logic
  const highRiskCategories = []; // Category risk ranking is not part of the statistical forecasting feature.
  const finalPrediction = prediction?.data?.finalPrediction;
  const forecastBudget = prediction?.forecastBudget;
  const forecastTarget = prediction?.forecastTarget;
  const hasValidForecast =
    prediction?.status === "success" &&
    typeof finalPrediction === "number" &&
    typeof forecastBudget?.amount === "number";

  const overspending_risk = hasValidForecast ? finalPrediction - forecastBudget.amount : 0;

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const currentDay = new Date().getDate();
  const remainingDays = Math.max(1, daysInMonth - currentDay);
  const safeDaily = overall.remaining > 0 ? overall.remaining / remainingDays : 0;

  return (
    <div className="dashboard-page">
      {/* PAGE HEADER */}
      <div className="page-heading">
        <div>
          <p className="eyebrow">OVERVIEW</p>
          <h1>Welcome back, {user?.name || "User"} 👋</h1>
          <p className="page-description">
            Here's your financial overview for {getMonthName(selectedMonth)} {selectedYear}.
          </p>
        </div>
        <div className="heading-actions">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="month-select"
          >
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {getMonthName(index + 1)}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="month-select"
          >
            {[2025, 2026, 2027, 2028].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <button className="primary-button" onClick={() => navigate("/expenses")}>
            <IconPlus size={18} /> Add Expense
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple">
            <IconBudgets size={22} />
          </div>
          <div>
            <span className="stat-label">Monthly Budget</span>
            <strong className="stat-value">{formatCurrency(overall.budget)}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <IconExpenses size={22} />
          </div>
          <div>
            <span className="stat-label">Total Spent</span>
            <strong className="stat-value">{formatCurrency(overall.spent)}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <IconCheck size={22} />
          </div>
          <div>
            <span className="stat-label">Remaining</span>
            <strong className="stat-value">{formatCurrency(Math.max(overall.remaining, 0))}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <IconTrendingUp size={22} />
          </div>
          <div>
            <span className="stat-label">Budget Used</span>
            <strong className="stat-value">{usage.toFixed(1)}%</strong>
          </div>
        </div>
      </div>

      {/* SMART RECOMMENDATIONS & INSIGHTS BANNER */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Smart Recommendations & Insights</h2>
            <p>Data-driven advice based on your spending patterns</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", padding: "1.25rem" }}>
          {highRiskCategories.length > 0 && (
            <div className="insight-card budget-danger" style={{ flex: "1 1 280px" }}>
              <div style={{ marginTop: "2px" }}><IconAlert size={20} /></div>
              <div>
                <h3>High Risk Category: {highRiskCategories[0].category}</h3>
                <p>{highRiskCategories[0].category} is your highest-risk spending category right now.</p>
              </div>
            </div>
          )}

          {overspending_risk > 0 && (
            <div className="insight-card budget-warning" style={{ flex: "1 1 280px" }}>
              <div style={{ marginTop: "2px" }}><IconAlert size={20} /></div>
              <div>
                <h3>Potential Overspending</h3>
                <p>
                  You may exceed your {forecastTarget?.label} budget by approximately{" "}
                  {formatCurrency(overspending_risk)}.
                </p>
              </div>
            </div>
          )}

          {prediction?.status === "success" && !forecastBudget && (
            <div className="insight-card budget-warning" style={{ flex: "1 1 280px" }}>
              <div style={{ marginTop: "2px" }}><IconInfo size={20} /></div>
              <div>
                <h3>No Forecast Budget</h3>
                <p>
                  No budget is set for {forecastTarget?.label}. Create an Overall budget to compare it with
                  your forecast.
                </p>
              </div>
            </div>
          )}

          {overall.remaining > 0 && (
            <div className="insight-card budget-safe" style={{ flex: "1 1 280px" }}>
              <div style={{ marginTop: "2px" }}><IconCheck size={20} /></div>
              <div>
                <h3>Safe Daily Spending</h3>
                <p>
                  You have {formatCurrency(overall.remaining)} remaining for {remainingDays} days (~
                  {formatCurrency(safeDaily)}/day).
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* OVERVIEW & CATEGORY BUDGETS GRID */}
      <div className="dashboard-grid">
        {/* SPENDING OVERVIEW */}
        <div className="panel spending-panel">
          <div className="panel-header">
            <div>
              <h2>Spending Overview</h2>
              <p>Your budget breakdown this month</p>
            </div>
          </div>
          <div className="spending-content">
            <div className="donut-wrapper">
              <div className="donut" style={{ "--usage": `${usage}%` }}>
                <div className="donut-center">
                  <strong>{usage.toFixed(0)}%</strong>
                  <span>used</span>
                </div>
              </div>
            </div>
            <div className="spending-details">
              <div>
                <span>Total Spent</span>
                <strong>{formatCurrency(overall.spent)}</strong>
              </div>
              <div>
                <span>Total Budget</span>
                <strong>{formatCurrency(overall.budget)}</strong>
              </div>
              <div>
                <span>Remaining</span>
                <strong style={{ color: overall.remaining < 0 ? "var(--color-danger)" : "var(--color-success-text)" }}>
                  {formatCurrency(overall.remaining)}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* CATEGORY BUDGETS */}
        <div className="panel category-panel">
          <div className="panel-header">
            <div>
              <h2>Category Budgets</h2>
              <p>Spending against your limits</p>
            </div>
            <button className="text-button" onClick={() => navigate("/budgets")}>
              View all <IconArrowRight size={14} />
            </button>
          </div>
          {summaryLoading ? (
            <div className="empty-state">Loading category budgets...</div>
          ) : summary?.categories?.length ? (
            <div className="category-list">
              {summary.categories.slice(0, 5).map((category) => {
                const percent =
                  category.budget > 0
                    ? Math.min((category.spent / category.budget) * 100, 100)
                    : 0;
                return (
                  <div className="category-row" key={category.category}>
                    <div className="category-row-top">
                      <span>{category.category}</span>
                      <strong>
                        {formatCurrency(category.spent)}{" "}
                        <small>/ {formatCurrency(category.budget)}</small>
                      </strong>
                    </div>
                    <div className="progress-track">
                      <div
                        className={`progress-fill ${
                          percent >= 100 ? "danger" : percent >= 80 ? "warning" : ""
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">₹</div>
              <h3>No category budgets</h3>
              <p>Create category budgets to keep your expenses organized.</p>
              <button className="primary-button" onClick={() => navigate("/budgets")}>
                <IconPlus size={16} /> Add Budget
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RECENT EXPENSES PANEL */}
      <div className="panel recent-panel">
        <div className="panel-header">
          <div>
            <h2>Recent Expenses</h2>
            <p>Your latest transactions for {getMonthName(selectedMonth)} {selectedYear}</p>
          </div>
          <button className="text-button" onClick={() => navigate("/expenses")}>
            View all <IconArrowRight size={14} />
          </button>
        </div>
        {loadingExpenses ? (
          <div className="empty-state">Loading expenses...</div>
        ) : currentMonthExpenses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">₹</div>
            <h3>No expenses yet</h3>
            <p>Add your first expense for this month to track your spending.</p>
            <button className="primary-button" onClick={() => navigate("/expenses")}>
              <IconPlus size={16} /> Add Expense
            </button>
          </div>
        ) : (
          <div className="transaction-list">
            {currentMonthExpenses.slice(0, 5).map((expense) => (
              <div className="transaction" key={expense._id}>
                <div className="transaction-left">
                  <div className="transaction-icon">
                    {expense.category?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <strong>{expense.category}</strong>
                    <span>{expense.description || expense.paymentMethod}</span>
                  </div>
                </div>
                <div className="transaction-right">
                  <strong>- {formatCurrency(expense.amount)}</strong>
                  <span>{formatDate(expense.date)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;

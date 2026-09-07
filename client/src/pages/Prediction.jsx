import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import {
  IconBrain,
  IconTrendingUp,
  IconCheck,
  IconAlert,
  IconInfo,
  IconPlus,
} from "../components/Icons";
import "../App.css";

const API_URL = "http://localhost:5000/api";
const REQUIRED_HISTORY_MONTHS = 3;

function Prediction() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [predictionData, setPredictionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPredictionData = async () => {
      if (!token) return;
      try {
        setLoading(true);
        setError("");
        const response = await axios.get(`${API_URL}/prediction`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPredictionData(response.data);
      } catch (requestError) {
        console.error("Failed to load prediction data:", requestError);
        setError("Unable to load prediction data. Please try again shortly.");
      } finally {
        setLoading(false);
      }
    };
    fetchPredictionData();
  }, [token]);

  const formatCurrency = (amount) =>
    `₹${Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;

  const historyMonths = predictionData?.historyMonths ?? 0;
  const status = predictionData?.status;
  const mlData = predictionData?.data;
  const hasValidForecast =
    status === "success" &&
    typeof mlData?.ensemble_prediction === "number" &&
    typeof mlData?.linear_regression?.prediction === "number" &&
    typeof mlData?.random_forest?.prediction === "number";

  // LOADING STATE
  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="panel">
          <div className="empty-state">
            <div className="empty-icon">✦</div>
            <h3>Generating ML Predictions...</h3>
            <p>Analyzing historical trends using Linear Regression & Random Forest models.</p>
          </div>
        </div>
      </div>
    );
  }

  // ERROR STATE
  if (error) {
    return (
      <div className="dashboard-page">
        <div className="panel">
          <div className="empty-state">
            <div className="empty-icon" style={{ backgroundColor: "var(--color-danger-bg)", color: "var(--color-danger)" }}>
              !
            </div>
            <h3>Something went wrong</h3>
            <p>{error}</p>
            <button className="primary-button" onClick={() => window.location.reload()}>
              Retry Loading
            </button>
          </div>
        </div>
      </div>
    );
  }

  // EMPTY STATE: 0 SPENDING HISTORY
  if (status === "no_data") {
    return (
      <div className="dashboard-page">
        <div
          className="panel"
          style={{
            maxWidth: 780,
            margin: "2rem auto",
            textAlign: "center",
            padding: "3.5rem 2rem",
          }}
        >
          <div className="eyebrow">SMART SPEND ML FORECAST</div>
          <div
            className="empty-icon"
            style={{
              width: 72,
              height: 72,
              fontSize: 32,
              margin: "1rem auto 1.5rem",
              background: "linear-gradient(135deg, var(--color-primary-light) 0%, #e0e7ff 100%)",
            }}
          >
            ✦
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: "var(--color-text-dark)" }}>
            Your spending forecast is waiting
          </h1>
          <p className="page-description" style={{ maxWidth: 580, margin: "0.875rem auto" }}>
            Add your expenses across months and SmartSpend will train custom Machine Learning models
            (Linear Regression & Random Forest) to learn your spending behavior.
          </p>

          <div
            className="dashboard-grid"
            style={{ textAlign: "left", margin: "2rem 0", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}
          >
            {[
              { title: "Ensemble ML Forecast", desc: "Blended predictions from dual ML models" },
              { title: "Linear & Random Forest", desc: "Statistical trend & tree-based forecasting" },
              { title: "Category Risk Ranking", desc: "Rule-based category overspending risk score" },
              { title: "Walk-Forward Validation", desc: "Out-of-sample MAE & RMSE evaluation metrics" },
            ].map((item) => (
              <div className="insight-card budget-info" key={item.title}>
                <div style={{ marginTop: 2 }}><IconCheck size={18} /></div>
                <div>
                  <h3 style={{ fontSize: 14 }}>{item.title}</h3>
                  <p style={{ fontSize: 12 }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ margin: "1.5rem 0", color: "var(--color-text-muted)", fontSize: 14 }}>
            <strong>0 months of spending history currently recorded</strong>
          </div>

          <button className="primary-button" onClick={() => navigate("/expenses")}>
            <IconPlus size={18} /> Add Your First Expense
          </button>
        </div>
      </div>
    );
  }

  // LIMITED DATA STATE: < 3 MONTHS HISTORY
  if (!hasValidForecast) {
    const monthsNeeded = Math.max(0, REQUIRED_HISTORY_MONTHS - historyMonths);
    const progress = Math.min(100, (historyMonths / REQUIRED_HISTORY_MONTHS) * 100);
    return (
      <div className="dashboard-page">
        <div
          className="panel"
          style={{
            maxWidth: 720,
            margin: "2rem auto",
            textAlign: "center",
            padding: "3.5rem 2rem",
          }}
        >
          <div className="eyebrow">PREDICTION ACCURACY NOTICE</div>
          <div
            className="empty-icon"
            style={{
              width: 64,
              height: 64,
              margin: "1rem auto 1.5rem",
              backgroundColor: "var(--color-warning-bg)",
              color: "var(--color-warning)",
            }}
          >
            <IconInfo size={32} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Directional Forecast Active</h1>
          <p className="page-description" style={{ maxWidth: 540, margin: "0.75rem auto" }}>
            We currently have {historyMonths} month{historyMonths === 1 ? "" : "s"} of spending history. Additional
            historical data will unlock high-confidence ensemble forecasts.
          </p>

          <div style={{ maxWidth: 480, margin: "2rem auto", textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem", fontSize: 13 }}>
              <strong>{historyMonths} / {REQUIRED_HISTORY_MONTHS} months of history</strong>
              <span style={{ color: "var(--color-text-muted)" }}>{monthsNeeded} more needed</span>
            </div>
            <div className="progress-track" style={{ height: 10 }}>
              <div className="progress-fill warning" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <p style={{ color: "var(--color-text-muted)", fontSize: 14, marginBottom: "1.75rem" }}>
            {predictionData?.message}
          </p>

          <button className="primary-button" onClick={() => navigate("/expenses")}>
            <IconPlus size={18} /> Add More Expenses
          </button>
        </div>
      </div>
    );
  }

  // FULL PREDICTION STATE
  const predictedLinear = mlData.linear_regression.prediction;
  const predictedRF = mlData.random_forest.prediction;
  const predictedNextMonth = mlData.ensemble_prediction;
  const forecastBudget = predictionData.forecastBudget;
  const budgetDifference = forecastBudget ? forecastBudget.amount - predictedNextMonth : null;
  const budgetStatus =
    budgetDifference === null
      ? "no-budget"
      : budgetDifference < 0
      ? "over"
      : predictedNextMonth / forecastBudget.amount >= 0.8
      ? "near"
      : "safe";
  const riskRanking = mlData.risk_ranking || [];
  const monthlySpending = predictionData.monthlySpending || [];

  return (
    <div className="dashboard-page">
      {/* PAGE HEADER */}
      <div className="page-heading">
        <div>
          <p className="eyebrow">PREDICTIVE ANALYTICS</p>
          <h1>Budget Forecast ({predictionData.forecastTarget?.label})</h1>
          <p className="page-description">
            Ensemble forecast combining Linear Regression (trend) and Random Forest (pattern recognition).
          </p>
        </div>
      </div>

      {/* FORECAST CARDS */}
      <div className="stats-grid">
        {/* PRIMARY ENSEMBLE FORECAST HERO CARD */}
        <div className="stat-card hero-card">
          <div className="stat-icon">
            <IconBrain size={24} />
          </div>
          <div>
            <span className="stat-label">Ensemble Forecast (Primary)</span>
            <strong className="stat-value">{formatCurrency(predictedNextMonth)}</strong>
          </div>
        </div>

        {/* LINEAR REGRESSION CARD */}
        <div className="stat-card">
          <div className="stat-icon orange">
            <IconTrendingUp size={22} />
          </div>
          <div>
            <span className="stat-label">Linear Regression</span>
            <strong className="stat-value">{formatCurrency(predictedLinear)}</strong>
          </div>
        </div>

        {/* RANDOM FOREST CARD */}
        <div className="stat-card">
          <div className="stat-icon green">
            <IconBrain size={22} />
          </div>
          <div>
            <span className="stat-label">Random Forest</span>
            <strong className="stat-value">{formatCurrency(predictedRF)}</strong>
          </div>
        </div>
      </div>

      {/* MODEL EVALUATION & BUDGET OUTLOOK */}
      <div className="dashboard-grid">
        {/* MODEL EVALUATION PANEL */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Walk-Forward Validation</h2>
              <p>Model accuracy evaluated on out-of-sample test splits</p>
            </div>
          </div>

          {!mlData.linear_regression.evaluation_reliable && (
            <div className="insight-card budget-warning" style={{ margin: "1.25rem 1.25rem 0" }}>
              <div style={{ marginTop: 2 }}><IconAlert size={18} /></div>
              <div>
                <h3>Limited Data Evaluation</h3>
                <p>{mlData.linear_regression.evaluation_note}</p>
              </div>
            </div>
          )}

          <div className="dashboard-grid" style={{ padding: "1.25rem", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
            <div className="stat-card" style={{ padding: "1rem" }}>
              <div>
                <span className="stat-label">Training Months</span>
                <strong className="stat-value" style={{ fontSize: 20 }}>{mlData.linear_regression.training_months}</strong>
              </div>
            </div>
            <div className="stat-card" style={{ padding: "1rem" }}>
              <div>
                <span className="stat-label">Linear MAE / RMSE</span>
                <strong className="stat-value" style={{ fontSize: 16 }}>
                  {formatCurrency(mlData.linear_regression.cv_mae)} / {formatCurrency(mlData.linear_regression.cv_rmse)}
                </strong>
              </div>
            </div>
            <div className="stat-card" style={{ padding: "1rem" }}>
              <div>
                <span className="stat-label">RF MAE / RMSE</span>
                <strong className="stat-value" style={{ fontSize: 16 }}>
                  {formatCurrency(mlData.random_forest.cv_mae)} / {formatCurrency(mlData.random_forest.cv_rmse)}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* BUDGET OUTLOOK PANEL */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Budget Outlook</h2>
              <p>Forecast vs planned budget for {predictionData.forecastTarget?.label}</p>
            </div>
          </div>

          {!forecastBudget ? (
            <div className="empty-state">
              <div className="empty-icon">₹</div>
              <h3>No budget set for {predictionData.forecastTarget?.label}</h3>
              <p>Create an Overall budget for {predictionData.forecastTarget?.label} to compare against this forecast.</p>
              <button className="primary-button" onClick={() => navigate("/budgets")}>
                <IconPlus size={16} /> Create Budget
              </button>
            </div>
          ) : (
            <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div className="dashboard-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div className="stat-card" style={{ padding: "1rem" }}>
                  <div>
                    <span className="stat-label">Target Budget</span>
                    <strong className="stat-value" style={{ fontSize: 18 }}>{formatCurrency(forecastBudget.amount)}</strong>
                  </div>
                </div>
                <div className="stat-card" style={{ padding: "1rem" }}>
                  <div>
                    <span className="stat-label">Projected Difference</span>
                    <strong
                      className="stat-value"
                      style={{
                        fontSize: 18,
                        color: budgetDifference < 0 ? "var(--color-danger)" : "var(--color-success-text)",
                      }}
                    >
                      {formatCurrency(Math.abs(budgetDifference))}{" "}
                      <small style={{ fontSize: 11 }}>{budgetDifference < 0 ? "Over Budget" : "Remaining"}</small>
                    </strong>
                  </div>
                </div>
              </div>

              <div
                className={`insight-card ${
                  budgetStatus === "over"
                    ? "budget-danger"
                    : budgetStatus === "near"
                    ? "budget-warning"
                    : "budget-safe"
                }`}
              >
                <div style={{ marginTop: 2 }}>
                  {budgetStatus === "over" ? <IconAlert size={20} /> : <IconCheck size={20} />}
                </div>
                <div>
                  <h3>
                    {budgetStatus === "over"
                      ? "Over Budget Risk"
                      : budgetStatus === "near"
                      ? "Near Budget Limit"
                      : "Within Budget"}
                  </h3>
                  <p>
                    {budgetStatus === "over"
                      ? `Your ensemble forecast is ${formatCurrency(Math.abs(budgetDifference))} above your target budget.`
                      : `Your ensemble forecast is within your planned target budget.`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CATEGORY RISK RANKING */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Category Risk Ranking</h2>
            <p>Deterministic rule-based risk evaluation for {predictionData.rankingPeriod?.label}</p>
          </div>
        </div>
        <div className="table-responsive">
          <table className="risk-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Category</th>
                <th>Score</th>
                <th>Risk Level</th>
                <th>Key Risk Factors</th>
              </tr>
            </thead>
            <tbody>
              {riskRanking.map((category) => {
                const riskLevelLower = category.risk_level.toLowerCase();
                const badgeClass =
                  riskLevelLower === "severe" || riskLevelLower === "high"
                    ? "badge-severe"
                    : riskLevelLower === "medium"
                    ? "badge-medium"
                    : "badge-low";
                return (
                  <tr key={category.category}>
                    <td style={{ fontWeight: 700, color: "var(--color-primary)" }}>#{category.rank}</td>
                    <td>
                      <strong style={{ color: "var(--color-text-dark)" }}>{category.category}</strong>
                    </td>
                    <td style={{ fontWeight: 600 }}>{category.risk_score}</td>
                    <td>
                      <span className={`badge ${badgeClass}`}>{category.risk_level}</span>
                    </td>
                    <td style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
                      {category.contributing_factors.join(", ")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* HISTORICAL SPENDING */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <h2>Historical Monthly Spending</h2>
            <p>Recent calendar month totals used for ML training</p>
          </div>
        </div>
        <div className="transaction-list">
          {monthlySpending.slice(-6).map((month) => (
            <div className="transaction" key={month.month}>
              <div className="transaction-left">
                <div className="transaction-icon">₹</div>
                <div>
                  <strong>{month.month}</strong>
                  <span>{month.transaction_count} transactions</span>
                </div>
              </div>
              <div className="transaction-right">
                <strong>{formatCurrency(month.amount)}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Prediction;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/useAuth";
import { IconBrain, IconTrendingUp, IconCheck, IconInfo, IconPlus } from "../components/Icons";
import "../App.css";

const API_URL = "http://localhost:5000/api";

const METHODS = [
  {
    key: "movingAverage",
    title: "Moving Average",
    short: "MA",
    description: "Averages the last three available calendar months, or all months if fewer than three are available.",
  },
  {
    key: "weightedMovingAverage",
    title: "Weighted Moving Average",
    short: "WMA",
    description: "Uses weights of 20%, 30%, and 50% for the oldest to most recent of the last three months.",
  },
  {
    key: "exponentialSmoothing",
    title: "Simple Exponential Smoothing",
    short: "SES",
    description: "Updates the forecast using alpha = 0.5, giving recent spending more influence.",
  },
];

function Prediction() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [predictionData, setPredictionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPredictionData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError("");
        const response = await axios.get(`${API_URL}/prediction`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setPredictionData(response.data);
      } catch (requestError) {
        console.error("Failed to load prediction data:", requestError);
        setError("Unable to load prediction data. Please make sure the backend is running, then try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchPredictionData();
  }, [token]);

  const formatCurrency = (amount) => `₹${Number(amount || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

  if (loading) {
    return <div className="dashboard-page"><div className="panel"><div className="empty-state">
      <div className="empty-icon">↗</div><h3>Calculating expense predictions...</h3>
      <p>Analyzing your monthly expenses with three statistical methods.</p>
    </div></div></div>;
  }

  if (error) {
    return <div className="dashboard-page"><div className="panel"><div className="empty-state">
      <div className="empty-icon">!</div><h3>Unable to load predictions</h3><p>{error}</p>
      <button className="primary-button" onClick={() => window.location.reload()}>Try Again</button>
    </div></div></div>;
  }

  if (predictionData?.status === "no_data" || !predictionData?.data) {
    return <div className="dashboard-page"><div className="panel" style={{ maxWidth: 780, margin: "2rem auto", textAlign: "center", padding: "3rem 2rem" }}>
      <div className="eyebrow">STATISTICAL EXPENSE FORECAST</div>
      <div className="empty-icon" style={{ width: 72, height: 72, fontSize: 32, margin: "1rem auto" }}>₹</div>
      <h1 style={{ fontSize: 30, fontWeight: 800 }}>Your prediction is waiting</h1>
      <p className="page-description" style={{ maxWidth: 560, margin: "1rem auto" }}>
        Add expenses to calculate next month's forecast using Moving Average, Weighted Moving Average, and Simple Exponential Smoothing.
      </p>
      <button className="primary-button" onClick={() => navigate("/expenses")}><IconPlus size={18} /> Add Expenses</button>
    </div></div>;
  }

  const { predictions, finalPrediction } = predictionData.data;
  const forecastBudget = predictionData.forecastBudget;
  const validation = predictionData.data.validation;
  const budgetDifference = forecastBudget ? forecastBudget.amount - finalPrediction : null;
  const budgetStatus = budgetDifference === null ? "no-budget" : budgetDifference < 0 ? "over" : finalPrediction / (forecastBudget.amount || 1) >= 0.8 ? "near" : "safe";
  const maxPrediction = Math.max(...METHODS.map((method) => predictions[method.key]), finalPrediction, 1);
  const monthlySpending = predictionData.monthlySpending || [];

  return (
    <div className="dashboard-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">STATISTICAL FORECASTING</p>
          <h1>Expense Prediction — {predictionData.forecastTarget?.label}</h1>
          <p className="page-description">Three statistical methods forecast your next month's expenses. Their average is shown as the final prediction.</p>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card hero-card">
          <div className="stat-icon"><IconBrain size={24} /></div>
          <div><span className="stat-label">Final Combined Prediction</span>
            <strong className="stat-value">{formatCurrency(finalPrediction)}</strong>
            <span style={{ display: "block", marginTop: 6, fontSize: 12, color: "var(--color-text-muted)" }}>Average of all three methods</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><IconTrendingUp size={22} /></div>
          <div><span className="stat-label">Months Analyzed</span><strong className="stat-value">{predictionData.historyMonths}</strong></div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><div><h2>Results from All Three Methods</h2><p>Each method calculates an independent forecast for {predictionData.forecastTarget?.label}.</p></div></div>
        <div className="dashboard-grid" style={{ padding: "1.25rem", gridTemplateColumns: "repeat(auto-fit, minmax(235px, 1fr))" }}>
          {METHODS.map((method) => (
            <div className="stat-card" key={method.key} style={{ display: "block", padding: "1.25rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.8rem" }}>
                <div className="stat-icon" style={{ width: 42, height: 42, fontSize: 13, fontWeight: 800 }}>{method.short}</div>
                <strong style={{ fontSize: 14 }}>{method.title}</strong>
              </div>
              <div className="stat-value" style={{ fontSize: 25, marginBottom: "0.65rem" }}>{formatCurrency(predictions[method.key])}</div>
              <p style={{ fontSize: 12, lineHeight: 1.6, color: "var(--color-text-muted)" }}>{method.description}</p>
              <div style={{ marginTop: "1rem", height: 7, borderRadius: 99, background: "var(--color-border-subtle)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, predictions[method.key] / maxPrediction * 100))}%`, background: "var(--color-primary)", borderRadius: 99 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><div><h2>How the Final Prediction Is Calculated</h2><p>All three method results receive equal weight.</p></div></div>
        <div style={{ padding: "1.25rem" }}>
          <div className="insight-card budget-info" style={{ marginBottom: "1rem" }}>
            <div style={{ marginTop: 2 }}><IconInfo size={20} /></div>
            <div><h3>Arithmetic mean</h3>
              <p>({METHODS.map((method) => formatCurrency(predictions[method.key])).join(" + ")}) ÷ 3 = <strong>{formatCurrency(finalPrediction)}</strong></p>
            </div>
          </div>
          <div className="table-responsive"><table className="risk-table"><thead><tr><th>Forecast method</th><th>Prediction</th><th>Contribution to average</th></tr></thead>
            <tbody>{METHODS.map((method) => <tr key={method.key}><td>{method.title}</td><td><strong>{formatCurrency(predictions[method.key])}</strong></td><td>{formatCurrency(predictions[method.key] / 3)}</td></tr>)}
              <tr><td><strong>Final Combined Prediction</strong></td><td><strong style={{ color: "var(--color-primary)" }}>{formatCurrency(finalPrediction)}</strong></td><td><strong>Equal-weight average</strong></td></tr>
            </tbody></table></div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header"><div><h2>Historical Forecast Accuracy</h2><p>Walk-forward validation predicts each held-out month using only earlier months.</p></div></div>
        {validation?.status === "complete" ? <div style={{ padding: "1.25rem" }}>
          <p className="page-description" style={{ marginBottom: "1rem" }}>{validation.folds} one-month-ahead holdout forecasts, with at least {validation.requiredTrainingMonths} months of history before the first holdout.</p>
          <div className="table-responsive"><table className="risk-table"><thead><tr><th>Method</th><th>MAE</th><th>RMSE</th><th>MAPE</th><th>Bias</th></tr></thead>
            <tbody>{Object.entries(validation.models).map(([key, metrics]) => <tr key={key}>
              <td><strong>{key === "ensemble" ? "Combined average" : METHODS.find((method) => method.key === key)?.title}</strong></td>
              <td>{formatCurrency(metrics.mae)}</td><td>{formatCurrency(metrics.rmse)}</td>
              <td>{metrics.mape === null ? "—" : `${metrics.mape}%`}</td><td>{formatCurrency(metrics.bias)}</td>
            </tr>)}</tbody>
          </table></div>
          <p className="page-description" style={{ marginTop: "1rem" }}>MAE and RMSE measure error in rupees. MAPE is the average percentage error (zero-spending months are excluded). Positive bias means the method tends to overpredict. Historical scores describe this data and are not a guarantee of future accuracy.</p>
        </div> : <div className="empty-state" style={{ padding: "2rem" }}><p>At least {validation?.requiredTrainingMonths || 12} months plus a holdout month are needed to calculate forecast accuracy.</p></div>}
      </div>

      <div className="panel">
        <div className="panel-header"><div><h2>Forecast vs Budget</h2><p>Comparison using the final combined prediction.</p></div></div>
        {!forecastBudget ? <div className="empty-state" style={{ padding: "2rem" }}><div className="empty-icon"><IconInfo size={22} /></div>
          <h3>No overall budget for {predictionData.forecastTarget?.label}</h3><p>Create an Overall budget to compare your forecast against a planned limit.</p>
          <button className="primary-button" onClick={() => navigate("/budgets")}><IconPlus size={16} /> Set Budget</button>
        </div> : <div style={{ padding: "1.25rem" }}>
          <div className="dashboard-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <div className="stat-card"><div><span className="stat-label">Target Budget</span><strong className="stat-value" style={{ fontSize: 22 }}>{formatCurrency(forecastBudget.amount)}</strong></div></div>
            <div className="stat-card"><div><span className="stat-label">Predicted Spending</span><strong className="stat-value" style={{ fontSize: 22 }}>{formatCurrency(finalPrediction)}</strong></div></div>
            <div className="stat-card"><div><span className="stat-label">{budgetDifference < 0 ? "Amount Over Budget" : "Budget Remaining"}</span><strong className="stat-value" style={{ fontSize: 22, color: budgetDifference < 0 ? "var(--color-danger)" : "var(--color-success-text)" }}>{formatCurrency(Math.abs(budgetDifference))}</strong></div></div>
          </div>
          <div className={`insight-card ${budgetStatus === "over" ? "budget-danger" : budgetStatus === "near" ? "budget-warning" : "budget-safe"}`} style={{ marginTop: "1rem" }}>
            <div style={{ marginTop: 2 }}>{budgetStatus === "over" ? <IconInfo size={20} /> : <IconCheck size={20} />}</div>
            <div><h3>{budgetStatus === "over" ? "Potential Overspending" : budgetStatus === "near" ? "Near Budget Limit" : "Within Budget"}</h3>
              <p>{budgetStatus === "over" ? `The combined forecast is ${formatCurrency(Math.abs(budgetDifference))} above your budget.` : budgetStatus === "near" ? "The forecast uses at least 80% of your planned budget." : "The combined forecast is within your planned budget."}</p>
            </div>
          </div>
        </div>}
      </div>

      <div className="panel">
        <div className="panel-header"><div><h2>Historical Monthly Spending</h2><p>Monthly totals used by the three forecasting methods. Missing months between recorded expenses count as ₹0.</p></div></div>
        <div className="transaction-list">
          {monthlySpending.slice(-24).map((month) => <div className="transaction" key={month.month}>
            <div className="transaction-left"><div className="transaction-icon">₹</div><div><strong>{month.label || month.month}</strong></div></div>
            <div className="transaction-right"><strong>{formatCurrency(month.amount)}</strong></div>
          </div>)}
        </div>
      </div>
    </div>
  );
}

export default Prediction;

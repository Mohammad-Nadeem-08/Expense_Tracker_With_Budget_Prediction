import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

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

    const formatCurrency = (amount) => `₹${Number(amount).toLocaleString("en-IN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;
    const historyMonths = predictionData?.historyMonths ?? 0;
    const status = predictionData?.status;
    const mlData = predictionData?.data;
    const hasValidForecast = status === "success"
        && typeof mlData?.ensemble_prediction === "number"
        && typeof mlData?.linear_regression?.prediction === "number"
        && typeof mlData?.random_forest?.prediction === "number";

    if (loading) {
        return <div className="dashboard-page"><div className="panel"><div className="empty-state">Loading prediction...</div></div></div>;
    }

    if (error) {
        return <div className="dashboard-page"><div className="panel"><div className="empty-state"><h3>Something went wrong</h3><p>{error}</p></div></div></div>;
    }

    if (status === "no_data") {
        return (
            <div className="dashboard-page">
                <div className="panel" style={{ maxWidth: 760, margin: "3rem auto", textAlign: "center", padding: "3rem 2rem" }}>
                    <p className="eyebrow">SMART FORECAST</p>
                    <div className="empty-icon" style={{ margin: "0 auto 1rem" }}>✦</div>
                    <h1>Your spending forecast is waiting</h1>
                    <p className="page-description" style={{ maxWidth: 560, margin: "1rem auto" }}>Your financial crystal ball needs a little history first.</p>
                    <p style={{ maxWidth: 610, margin: "1rem auto 2rem" }}>Add expenses across different months and SmartSpend will learn your spending patterns and unlock personalized forecasts.</p>
                    <div className="dashboard-grid" style={{ textAlign: "left", marginBottom: "2rem" }}>
                        {["Spending Forecast", "Linear Regression + Random Forest", "Category Risk Ranking", "Smart Recommendations"].map((item) => (
                            <div className="insight-card budget-safe" key={item}><div className="insight-icon">✓</div><div><h3>{item}</h3></div></div>
                        ))}
                    </div>
                    <p><strong>0 months of spending history</strong></p>
                    <button className="primary-button" onClick={() => navigate("/expenses")}>Add Your First Expense</button>
                </div>
            </div>
        );
    }

    if (!hasValidForecast) {
        const monthsNeeded = Math.max(0, REQUIRED_HISTORY_MONTHS - historyMonths);
        const progress = Math.min(100, (historyMonths / REQUIRED_HISTORY_MONTHS) * 100);
        return (
            <div className="dashboard-page">
                <div className="panel" style={{ maxWidth: 700, margin: "3rem auto", textAlign: "center", padding: "3rem 2rem" }}>
                    <p className="eyebrow">SMART FORECAST</p>
                    <div className="empty-icon" style={{ margin: "0 auto 1rem" }}>⌁</div>
                    <h1>You&apos;re almost ready!</h1>
                    <p className="page-description" style={{ margin: "1rem auto" }}>We have {historyMonths} month{historyMonths === 1 ? "" : "s"} of spending history. Add more history to unlock your personalized forecast.</p>
                    <div style={{ maxWidth: 460, margin: "2rem auto", textAlign: "left" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".5rem" }}><strong>{historyMonths} / {REQUIRED_HISTORY_MONTHS} months of history</strong><span>{monthsNeeded} more needed</span></div>
                        <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
                    </div>
                    <p style={{ marginBottom: "1.5rem" }}>{predictionData?.message}</p>
                    <button className="primary-button" onClick={() => navigate("/expenses")}>Add More Expenses</button>
                </div>
            </div>
        );
    }

    const predictedLinear = mlData.linear_regression.prediction;
    const predictedRF = mlData.random_forest.prediction;
    const predictedNextMonth = mlData.ensemble_prediction;
    const forecastBudget = predictionData.forecastBudget;
    const budgetDifference = forecastBudget ? forecastBudget.amount - predictedNextMonth : null;
    const budgetStatus = budgetDifference === null ? "no-budget" : budgetDifference < 0 ? "over"
        : predictedNextMonth / forecastBudget.amount >= 0.8 ? "near" : "safe";
    const riskRanking = mlData.risk_ranking || [];
    const monthlySpending = predictionData.monthlySpending || [];

    return (
        <div className="dashboard-page">
            <div className="page-heading"><div><p className="eyebrow">INSIGHTS</p><h1>Smart Forecast</h1><p className="page-description">Forecast for {predictionData.forecastTarget?.label}: ensemble forecasting using Linear Regression & Random Forest.</p></div></div>
            <div className="stats-grid">
                <div className="stat-card"><div className="stat-icon purple">₹</div><div><span className="stat-label">Ensemble Estimate</span><strong className="stat-value">{formatCurrency(predictedNextMonth)}</strong></div></div>
                <div className="stat-card"><div className="stat-icon orange">LR</div><div><span className="stat-label">Linear Regression</span><strong className="stat-value">{formatCurrency(predictedLinear)}</strong></div></div>
                <div className="stat-card"><div className="stat-icon green">RF</div><div><span className="stat-label">Random Forest</span><strong className="stat-value">{formatCurrency(predictedRF)}</strong></div></div>
            </div>
            <div className="dashboard-grid">
                <div className="panel"><div className="panel-header"><div><h2>Model Evaluation</h2><p>Walk-forward validation, not training-set accuracy</p></div></div>
                    {!mlData.linear_regression.evaluation_reliable && <div className="insight-card budget-warning" style={{ margin: "1rem" }}><div><h3>Limited data</h3><p>{mlData.linear_regression.evaluation_note}</p></div></div>}
                    <div className="dashboard-grid" style={{ padding: "0 1rem 1rem" }}>
                        <div className="stat-card"><div><span className="stat-label">Training Months</span><strong className="stat-value">{mlData.linear_regression.training_months}</strong></div></div>
                        <div className="stat-card"><div><span className="stat-label">Linear MAE / RMSE</span><strong className="stat-value">{formatCurrency(mlData.linear_regression.cv_mae)} / {formatCurrency(mlData.linear_regression.cv_rmse)}</strong></div></div>
                        <div className="stat-card"><div><span className="stat-label">RF MAE / RMSE</span><strong className="stat-value">{formatCurrency(mlData.random_forest.cv_mae)} / {formatCurrency(mlData.random_forest.cv_rmse)}</strong></div></div>
                    </div>
                </div>
                <div className="panel"><div className="panel-header"><div><h2>Budget Outlook</h2><p>Forecast vs {predictionData.forecastTarget?.label}</p></div></div>
                    {!forecastBudget ? <div className="empty-state"><div className="empty-icon">₹</div><h3>No budget set for forecast month.</h3><p>Create an Overall budget for {predictionData.forecastTarget?.label} to compare it with this forecast.</p></div> : <div style={{ padding: "1rem" }}>
                        <div className="dashboard-grid" style={{ marginBottom: "1rem" }}><div className="stat-card"><div><span className="stat-label">Forecast-month Budget</span><strong className="stat-value">{formatCurrency(forecastBudget.amount)}</strong></div></div><div className="stat-card"><div><span className="stat-label">Projected Difference</span><strong className="stat-value">{formatCurrency(Math.abs(budgetDifference))} {budgetDifference < 0 ? "Over Budget" : "Remaining"}</strong></div></div></div>
                        <div className={`insight-card ${budgetStatus === "over" ? "budget-danger" : budgetStatus === "near" ? "budget-warning" : "budget-safe"}`}><div><h3>{budgetStatus === "over" ? "Over Budget Risk" : budgetStatus === "near" ? "Near Budget Limit" : "Within Budget"}</h3><p>{budgetStatus === "over" ? `Your forecast is ${formatCurrency(Math.abs(budgetDifference))} above this month’s budget.` : `Your forecast is within this month’s budget.`}</p></div></div>
                    </div>}
                </div>
            </div>
            <div className="panel"><div className="panel-header"><div><h2>Category Risk Ranking</h2><p>Spending risk for {predictionData.rankingPeriod?.label}</p></div></div><div className="table-responsive"><table className="risk-table" style={{ width: "100%", textAlign: "left" }}><thead><tr><th>Rank</th><th>Category</th><th>Score</th><th>Risk Level</th><th>Key Drivers</th></tr></thead><tbody>{riskRanking.map((category) => <tr key={category.category}><td>#{category.rank}</td><td><strong>{category.category}</strong></td><td>{category.risk_score}</td><td><span className={`badge badge-${category.risk_level.toLowerCase()}`}>{category.risk_level}</span></td><td>{category.contributing_factors.join(", ")}</td></tr>)}</tbody></table></div></div>
            <div className="panel"><div className="panel-header"><div><h2>Spending History</h2><p>Calendar-month totals</p></div></div><div className="transaction-list">{monthlySpending.slice(-6).map((month) => <div className="transaction" key={month.month}><div className="transaction-left"><div className="transaction-icon">₹</div><div><strong>{month.month}</strong><span>{month.transaction_count} transactions</span></div></div><div className="transaction-right"><strong>{formatCurrency(month.amount)}</strong></div></div>)}</div></div>
        </div>
    );
}

export default Prediction;

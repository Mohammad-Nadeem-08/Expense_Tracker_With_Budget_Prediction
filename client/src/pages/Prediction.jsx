import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const API_URL = "http://localhost:5000/api";

function Prediction() {
    const { token } = useAuth();

    const [predictionData, setPredictionData] = useState(null);
    const [budgets, setBudgets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // ==========================================
    // FETCH ML PREDICTION + USER BUDGETS
    // ==========================================

    useEffect(() => {
        const fetchPredictionData = async () => {
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError("");

                const config = {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                };

                const [
                    predictionResponse,
                    budgetResponse,
                ] = await Promise.all([
                    axios.get(
                        `${API_URL}/prediction`,
                        config
                    ),
                    axios.get(
                        `${API_URL}/budgets`,
                        config
                    ),
                ]);

                setPredictionData(
                    predictionResponse.data
                );

                setBudgets(
                    Array.isArray(
                        budgetResponse.data
                    )
                        ? budgetResponse.data
                        : []
                );

            } catch (err) {
                console.error(
                    "Failed to load prediction data:",
                    err
                );

                setError(
                    "Unable to load prediction data."
                );
            } finally {
                setLoading(false);
            }
        };

        fetchPredictionData();
    }, [token]);


    // ==========================================
    // FORMAT CURRENCY
    // ==========================================

    const formatCurrency = (amount) => {
        return `₹${Number(
            amount || 0
        ).toLocaleString("en-IN", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        })}`;
    };


    // ==========================================
    // MONTHLY SPENDING FROM BACKEND
    // ==========================================

    const monthlySpending = useMemo(() => {
        return (
            predictionData?.monthlySpending || []
        );
    }, [predictionData]);


    // ==========================================
    // ML PREDICTION
    // ==========================================

    const predictedNextMonth =
        Number(
            predictionData?.prediction || 0
        );


    // ==========================================
    // ML INFORMATION
    // ==========================================

    const modelName =
        predictionData?.model ||
        "Linear Regression";

    const trainingMonths =
        predictionData?.trainingMonths ||
        0;

    const r2Score =
        predictionData?.r2Score;


    // ==========================================
    // AVERAGE MONTHLY SPENDING
    // ==========================================

    const averageMonthlySpending = useMemo(() => {
        if (monthlySpending.length === 0) {
            return 0;
        }

        const total =
            monthlySpending.reduce(
                (sum, month) =>
                    sum +
                    Number(
                        month.amount || 0
                    ),
                0
            );

        return (
            total /
            monthlySpending.length
        );
    }, [monthlySpending]);


    // ==========================================
    // TOTAL SPENDING
    // ==========================================

    const totalSpent = useMemo(() => {
        return monthlySpending.reduce(
            (total, month) =>
                total +
                Number(
                    month.amount || 0
                ),
            0
        );
    }, [monthlySpending]);


    // ==========================================
    // CATEGORY SPENDING
    // ==========================================

    const categorySpending =
        useMemo(() => {

            const categories = {};

            /*
             * Category information is not currently
             * returned by the ML endpoint.
             *
             * This section is intentionally kept
             * empty rather than making another
             * unnecessary API request.
             */

            return categories;

        }, []);


    // ==========================================
    // OVERALL BUDGET
    // ==========================================

    const overallBudget = useMemo(() => {

        const overallBudgets =
            budgets.filter(
                (budget) =>
                    budget.category ===
                    "Overall"
            );

        if (
            overallBudgets.length === 0
        ) {
            return 0;
        }

        const latestBudget =
            [...overallBudgets].sort(
                (a, b) => {
                    return (
                        new Date(
                            b.createdAt || 0
                        ) -
                        new Date(
                            a.createdAt || 0
                        )
                    );
                }
            )[0];

        return Number(
            latestBudget.amount || 0
        );

    }, [budgets]);


    // ==========================================
    // BUDGET DIFFERENCE
    // ==========================================

    const budgetDifference =
        overallBudget -
        predictedNextMonth;


    // ==========================================
    // BUDGET STATUS
    // ==========================================

    const budgetStatus = useMemo(() => {

        if (overallBudget === 0) {
            return "no-budget";
        }

        const percentage =
            (predictedNextMonth /
                overallBudget) *
            100;

        if (percentage > 100) {
            return "over";
        }

        if (percentage >= 80) {
            return "near";
        }

        return "safe";

    }, [
        overallBudget,
        predictedNextMonth,
    ]);


    // ==========================================
    // SPENDING TREND
    // ==========================================

    const spendingTrend = useMemo(() => {

        if (monthlySpending.length < 2) {
            return "stable";
        }

        const current =
            Number(
                monthlySpending[
                    monthlySpending.length - 1
                ].amount || 0
            );

        const previous =
            Number(
                monthlySpending[
                    monthlySpending.length - 2
                ].amount || 0
            );

        if (current > previous * 1.1) {
            return "increasing";
        }

        if (current < previous * 0.9) {
            return "decreasing";
        }

        return "stable";

    }, [monthlySpending]);


    // ==========================================
    // HIGHEST CATEGORY
    // ==========================================

    const highestCategory = useMemo(() => {

        const entries =
            Object.entries(
                categorySpending
            );

        if (entries.length === 0) {
            return null;
        }

        entries.sort(
            (a, b) => b[1] - a[1]
        );

        return {
            name: entries[0][0],
            amount: entries[0][1],
        };

    }, [categorySpending]);


    // ==========================================
    // LOADING
    // ==========================================

    if (loading) {
        return (
            <div className="dashboard-page">

                <div className="page-heading">

                    <div>

                        <p className="eyebrow">
                            INSIGHTS
                        </p>

                        <h1>
                            Spending Prediction
                        </h1>

                        <p className="page-description">
                            Analyzing your spending
                            patterns using machine
                            learning.
                        </p>

                    </div>

                </div>

                <div className="panel">

                    <div className="empty-state">
                        Loading prediction...
                    </div>

                </div>

            </div>
        );
    }


    // ==========================================
    // ERROR
    // ==========================================

    if (error) {
        return (
            <div className="dashboard-page">

                <div className="page-heading">

                    <div>

                        <p className="eyebrow">
                            INSIGHTS
                        </p>

                        <h1>
                            Spending Prediction
                        </h1>

                        <p className="page-description">
                            Analyzing your spending
                            patterns using machine
                            learning.
                        </p>

                    </div>

                </div>

                <div className="panel">

                    <div className="empty-state">

                        <h3>
                            Something went wrong
                        </h3>

                        <p>
                            {error}
                        </p>

                    </div>

                </div>

            </div>
        );
    }


    // ==========================================
    // PAGE
    // ==========================================

    return (
        <div className="dashboard-page">

            {/* ==================================
                HEADER
            =================================== */}

            <div className="page-heading">

                <div>

                    <p className="eyebrow">
                        INSIGHTS
                    </p>

                    <h1>
                        Spending Prediction
                    </h1>

                    <p className="page-description">
                        Analyze your spending patterns
                        and predict your next month's
                        expenses.
                    </p>

                </div>

            </div>


            {/* ==================================
                ML SUMMARY
            =================================== */}

            <div className="stats-grid">

                <div className="stat-card">

                    <div className="stat-icon purple">
                        ₹
                    </div>

                    <div>

                        <span className="stat-label">
                            ML Predicted Next Month
                        </span>

                        <strong className="stat-value">
                            {predictionData?.prediction !==
                            null
                                ? formatCurrency(
                                      predictedNextMonth
                                  )
                                : "—"}
                        </strong>

                    </div>

                </div>


                <div className="stat-card">

                    <div className="stat-icon orange">
                        ↗
                    </div>

                    <div>

                        <span className="stat-label">
                            Average Monthly Spending
                        </span>

                        <strong className="stat-value">
                            {formatCurrency(
                                averageMonthlySpending
                            )}
                        </strong>

                    </div>

                </div>


                <div className="stat-card">

                    <div className="stat-icon green">
                        ML
                    </div>

                    <div>

                        <span className="stat-label">
                            Prediction Model
                        </span>

                        <strong className="stat-value">
                            {modelName}
                        </strong>

                    </div>

                </div>

            </div>


            {/* ==================================
                ML MODEL DETAILS
            =================================== */}

            <div className="panel">

                <div className="panel-header">

                    <div>

                        <h2>
                            Machine Learning Prediction
                        </h2>

                        <p>
                            Your prediction is generated
                            using your historical spending
                            data.
                        </p>

                    </div>

                </div>


                {predictionData?.prediction ===
                null ? (

                    <div className="empty-state">

                        <div className="empty-icon">
                            ML
                        </div>

                        <h3>
                            Not enough data
                        </h3>

                        <p>
                            {predictionData?.message ||
                                "Add expenses across at least 3 different months to generate an ML prediction."}
                        </p>

                    </div>

                ) : (

                    <div>

                        <div className="dashboard-grid">

                            <div className="stat-card">

                                <div className="stat-icon purple">
                                    ML
                                </div>

                                <div>

                                    <span className="stat-label">
                                        Model
                                    </span>

                                    <strong className="stat-value">
                                        {modelName}
                                    </strong>

                                </div>

                            </div>


                            <div className="stat-card">

                                <div className="stat-icon orange">
                                    #
                                </div>

                                <div>

                                    <span className="stat-label">
                                        Training Months
                                    </span>

                                    <strong className="stat-value">
                                        {trainingMonths}
                                    </strong>

                                </div>

                            </div>


                            <div className="stat-card">

                                <div className="stat-icon green">
                                    R²
                                </div>

                                <div>

                                    <span className="stat-label">
                                        Model Score
                                    </span>

                                    <strong className="stat-value">

                                        {typeof r2Score ===
                                        "number"
                                            ? r2Score.toFixed(
                                                  2
                                              )
                                            : "—"}

                                    </strong>

                                </div>

                            </div>

                        </div>


                        <div className="insight-card">

                            <div className="insight-icon">
                                ✦
                            </div>

                            <div>

                                <h3>
                                    ML prediction generated
                                </h3>

                                <p>
                                    Based on{" "}
                                    <strong>
                                        {trainingMonths}
                                    </strong>{" "}
                                    months of your
                                    historical spending,
                                    the{" "}
                                    <strong>
                                        {modelName}
                                    </strong>{" "}
                                    model predicts that
                                    you may spend
                                    approximately{" "}
                                    <strong>
                                        {formatCurrency(
                                            predictedNextMonth
                                        )}
                                    </strong>{" "}
                                    next month.
                                </p>

                            </div>

                        </div>

                    </div>

                )}

            </div>


            {/* ==================================
                BUDGET OUTLOOK
            =================================== */}

            <div className="panel">

                <div className="panel-header">

                    <div>

                        <h2>
                            Budget Outlook
                        </h2>

                        <p>
                            Compare your ML prediction
                            with your monthly budget.
                        </p>

                    </div>

                </div>


                {overallBudget === 0 ? (

                    <div className="empty-state">

                        <div className="empty-icon">
                            ₹
                        </div>

                        <h3>
                            No Overall Budget
                        </h3>

                        <p>
                            Create an Overall budget
                            to compare your predicted
                            spending with your limit.
                        </p>

                    </div>

                ) : (

                    <>

                        <div className="dashboard-grid">

                            <div className="stat-card">

                                <div className="stat-icon purple">
                                    ₹
                                </div>

                                <div>

                                    <span className="stat-label">
                                        Monthly Budget
                                    </span>

                                    <strong className="stat-value">
                                        {formatCurrency(
                                            overallBudget
                                        )}
                                    </strong>

                                </div>

                            </div>


                            <div className="stat-card">

                                <div className="stat-icon orange">
                                    ↗
                                </div>

                                <div>

                                    <span className="stat-label">
                                        ML Prediction
                                    </span>

                                    <strong className="stat-value">
                                        {formatCurrency(
                                            predictedNextMonth
                                        )}
                                    </strong>

                                </div>

                            </div>


                            <div className="stat-card">

                                <div
                                    className={`stat-icon ${
                                        budgetStatus ===
                                        "over"
                                            ? "red"
                                            : budgetStatus ===
                                              "near"
                                            ? "orange"
                                            : "green"
                                    }`}
                                >

                                    {budgetStatus ===
                                    "over"
                                        ? "!"
                                        : "✓"}

                                </div>

                                <div>

                                    <span className="stat-label">
                                        Expected Remaining
                                    </span>

                                    <strong className="stat-value">

                                        {formatCurrency(
                                            Math.max(
                                                0,
                                                budgetDifference
                                            )
                                        )}

                                    </strong>

                                </div>

                            </div>

                        </div>


                        <div
                            className={`insight-card ${
                                budgetStatus ===
                                "over"
                                    ? "budget-danger"
                                    : budgetStatus ===
                                      "near"
                                    ? "budget-warning"
                                    : "budget-safe"
                            }`}
                        >

                            <div className="insight-icon">

                                {budgetStatus ===
                                "over"
                                    ? "!"
                                    : budgetStatus ===
                                      "near"
                                    ? "!"
                                    : "✓"}

                            </div>

                            <div>

                                <h3>

                                    {budgetStatus ===
                                    "over"
                                        ? "Over Budget Risk"
                                        : budgetStatus ===
                                          "near"
                                        ? "Near Budget Limit"
                                        : "Within Budget"}

                                </h3>

                                <p>

                                    {budgetStatus ===
                                    "over"
                                        ? `Your ML model predicts spending ${formatCurrency(
                                              Math.abs(
                                                  budgetDifference
                                              )
                                          )} above your monthly budget.`
                                        : budgetStatus ===
                                          "near"
                                        ? `Your predicted spending is close to your budget.`
                                        : `Your predicted spending is currently within your budget.`}

                                </p>

                            </div>

                        </div>

                    </>

                )}

            </div>


            {/* ==================================
                SPENDING HISTORY
            =================================== */}

            <div className="panel">

                <div className="panel-header">

                    <div>

                        <h2>
                            Spending History
                        </h2>

                        <p>
                            Monthly spending used by
                            the prediction system.
                        </p>

                    </div>

                </div>


                {monthlySpending.length ===
                0 ? (

                    <div className="empty-state">

                        <h3>
                            No spending history
                        </h3>

                        <p>
                            Add expenses to begin
                            building your prediction
                            history.
                        </p>

                    </div>

                ) : (

                    <div className="transaction-list">

                        {monthlySpending
                            .slice(-6)
                            .map((month) => (

                                <div
                                    className="transaction"
                                    key={month.month}
                                >

                                    <div className="transaction-left">

                                        <div className="transaction-icon">
                                            ₹
                                        </div>

                                        <div>

                                            <strong>
                                                {new Date(
                                                    `${month.month}-01T00:00:00`
                                                ).toLocaleString(
                                                    "default",
                                                    {
                                                        month: "long",
                                                        year: "numeric",
                                                    }
                                                )}
                                            </strong>

                                            <span>
                                                Monthly spending
                                            </span>

                                        </div>

                                    </div>


                                    <div className="transaction-right">

                                        <strong>
                                            {formatCurrency(
                                                month.amount
                                            )}
                                        </strong>

                                    </div>

                                </div>

                            ))}

                    </div>

                )}

            </div>


            {/* ==================================
                SPENDING ANALYSIS
            =================================== */}

            <div className="panel">

                <div className="panel-header">

                    <div>

                        <h2>
                            Spending Analysis
                        </h2>

                        <p>
                            Overview of your recorded
                            spending behavior.
                        </p>

                    </div>

                </div>


                <div className="dashboard-grid">

                    <div className="stat-card">

                        <div className="stat-icon purple">
                            ₹
                        </div>

                        <div>

                            <span className="stat-label">
                                Total Spending
                            </span>

                            <strong className="stat-value">
                                {formatCurrency(
                                    totalSpent
                                )}
                            </strong>

                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-icon orange">
                            ↗
                        </div>

                        <div>

                            <span className="stat-label">
                                Spending Trend
                            </span>

                            <strong className="stat-value">

                                {spendingTrend ===
                                "increasing"
                                    ? "Increasing"
                                    : spendingTrend ===
                                      "decreasing"
                                    ? "Decreasing"
                                    : "Stable"}

                            </strong>

                        </div>

                    </div>


                    <div className="stat-card">

                        <div className="stat-icon green">
                            #
                        </div>

                        <div>

                            <span className="stat-label">
                                Months Available
                            </span>

                            <strong className="stat-value">
                                {monthlySpending.length}
                            </strong>

                        </div>

                    </div>

                </div>

            </div>


            {/* ==================================
                SMART INSIGHT
            =================================== */}

            <div className="panel">

                <div className="panel-header">

                    <div>

                        <h2>
                            Smart Insight
                        </h2>

                        <p>
                            Personalized observation
                            from your spending data.
                        </p>

                    </div>

                </div>


                <div className="insight-card">

                    <div className="insight-icon">
                        ✦
                    </div>

                    <div>

                        <h3>
                            Your spending outlook
                        </h3>

                        {predictionData?.prediction ===
                        null ? (

                            <p>
                                Keep recording expenses
                                across different months
                                to unlock ML-powered
                                predictions.
                            </p>

                        ) : (

                            <p>
                                Your{" "}
                                <strong>
                                    {modelName}
                                </strong>{" "}
                                model predicts approximately{" "}
                                <strong>
                                    {formatCurrency(
                                        predictedNextMonth
                                    )}
                                </strong>{" "}
                                in spending next month,
                                based on{" "}
                                <strong>
                                    {trainingMonths}
                                </strong>{" "}
                                months of historical
                                data.
                            </p>

                        )}

                    </div>

                </div>

            </div>

        </div>
    );
}

export default Prediction;
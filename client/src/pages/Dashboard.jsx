import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../App.css";

const EXPENSE_API = "http://localhost:5000/api/expenses";
const BUDGET_API = "http://localhost:5000/api/budgets";

const authConfig = (token) => ({
    headers: {
        Authorization: `Bearer ${token}`,
    },
});

function Dashboard() {
    const { user, token } = useAuth();
    const navigate = useNavigate();

    const [expenses, setExpenses] = useState([]);
    const [summary, setSummary] = useState(null);

    const [loadingExpenses, setLoadingExpenses] =
        useState(true);

    const [summaryLoading, setSummaryLoading] =
        useState(true);

    const [selectedMonth, setSelectedMonth] =
        useState(new Date().getMonth() + 1);

    const [selectedYear, setSelectedYear] =
        useState(new Date().getFullYear());

    // =========================
    // HELPERS
    // =========================

    const getMonthName = (month) => {
        return new Date(
            2000,
            month - 1,
            1
        ).toLocaleString("default", {
            month: "long",
        });
    };

    const formatCurrency = (amount) => {
        return `₹${Number(amount || 0).toLocaleString(
            "en-IN",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }
        )}`;
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString(
            "en-IN",
            {
                day: "numeric",
                month: "short",
                year: "numeric",
            }
        );
    };

    // =========================
    // FETCH EXPENSES
    // =========================

    const fetchExpenses = async () => {
        if (!token) return;

        try {
            setLoadingExpenses(true);

            const response = await axios.get(
                EXPENSE_API,
                authConfig(token)
            );

            setExpenses(response.data);
        } catch (error) {
            console.error(
                "Failed to load expenses:",
                error
            );
        } finally {
            setLoadingExpenses(false);
        }
    };

    // =========================
    // FETCH BUDGET SUMMARY
    // =========================

    const fetchSummary = async () => {
        if (!token) return;

        try {
            setSummaryLoading(true);

            const response = await axios.get(
                `${BUDGET_API}/summary/${selectedMonth}/${selectedYear}`,
                authConfig(token)
            );

            setSummary(response.data);
        } catch (error) {
            console.error(
                "Failed to load dashboard summary:",
                error
            );

            setSummary(null);
        } finally {
            setSummaryLoading(false);
        }
    };

    // =========================
    // INITIAL LOAD
    // =========================

    useEffect(() => {
        if (!token) return;

        fetchExpenses();
    }, [token]);

    // =========================
    // SUMMARY LOAD
    // =========================

    useEffect(() => {
        if (!token) return;

        fetchSummary();
    }, [
        token,
        selectedMonth,
        selectedYear,
    ]);

    // =========================
    // CURRENT MONTH EXPENSES
    // =========================

    const currentMonthExpenses = useMemo(() => {
        return expenses.filter((expense) => {
            const date = new Date(expense.date);

            return (
                date.getMonth() + 1 ===
                    selectedMonth &&
                date.getFullYear() ===
                    selectedYear
            );
        });
    }, [
        expenses,
        selectedMonth,
        selectedYear,
    ]);

    // =========================
    // SUMMARY VALUES
    // =========================

    const overall = summary?.overall || {
        budget: 0,
        spent: 0,
        remaining: 0,
    };

    const usage =
        overall.budget > 0
            ? Math.min(
                  (overall.spent /
                      overall.budget) *
                      100,
                  100
              )
            : 0;

    // =========================
    // UI
    // =========================

    return (
        <div className="dashboard-page">

            {/* =========================
                HEADER
            ========================= */}

            <div className="page-heading">

                <div>
                    <p className="eyebrow">
                        OVERVIEW
                    </p>

                    <h1>
                        Good evening,{" "}
                        {user?.name || "User"} 👋
                    </h1>

                    <p className="page-description">
                        Here's your financial overview
                        for{" "}
                        {getMonthName(
                            selectedMonth
                        )}{" "}
                        {selectedYear}.
                    </p>
                </div>

                <div className="heading-actions">

                    <select
                        value={selectedMonth}
                        onChange={(e) =>
                            setSelectedMonth(
                                Number(
                                    e.target.value
                                )
                            )
                        }
                        className="month-select"
                    >
                        {Array.from(
                            { length: 12 },
                            (_, index) => (
                                <option
                                    key={
                                        index + 1
                                    }
                                    value={
                                        index + 1
                                    }
                                >
                                    {getMonthName(
                                        index + 1
                                    )}
                                </option>
                            )
                        )}
                    </select>

                    <button
                        className="primary-button"
                        onClick={() =>
                            navigate(
                                "/expenses"
                            )
                        }
                    >
                        + Add Expense
                    </button>

                </div>

            </div>


            {/* =========================
                STAT CARDS
            ========================= */}

            <div className="stats-grid">

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
                                overall.budget
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
                            Total Spent
                        </span>

                        <strong className="stat-value">
                            {formatCurrency(
                                overall.spent
                            )}
                        </strong>
                    </div>

                </div>


                <div className="stat-card">

                    <div className="stat-icon green">
                        ✓
                    </div>

                    <div>
                        <span className="stat-label">
                            Remaining
                        </span>

                        <strong className="stat-value">
                            {formatCurrency(
                                Math.max(
                                    overall.remaining,
                                    0
                                )
                            )}
                        </strong>
                    </div>

                </div>


                <div className="stat-card">

                    <div className="stat-icon blue">
                        %
                    </div>

                    <div>
                        <span className="stat-label">
                            Budget Used
                        </span>

                        <strong className="stat-value">
                            {usage.toFixed(1)}%
                        </strong>
                    </div>

                </div>

            </div>


            {/* =========================
                MAIN GRID
            ========================= */}

            <div className="dashboard-grid">

                {/* SPENDING OVERVIEW */}

                <div className="panel spending-panel">

                    <div className="panel-header">

                        <div>
                            <h2>
                                Spending Overview
                            </h2>

                            <p>
                                Your expenses this
                                month
                            </p>
                        </div>

                    </div>


                    <div className="spending-content">

                        <div className="donut-wrapper">

                            <div
                                className="donut"
                                style={{
                                    "--usage":
                                        `${usage}%`,
                                }}
                            >

                                <div className="donut-center">

                                    <strong>
                                        {usage.toFixed(
                                            0
                                        )}
                                        %
                                    </strong>

                                    <span>
                                        used
                                    </span>

                                </div>

                            </div>

                        </div>


                        <div className="spending-details">

                            <div>
                                <span>
                                    Spent
                                </span>

                                <strong>
                                    {formatCurrency(
                                        overall.spent
                                    )}
                                </strong>
                            </div>


                            <div>
                                <span>
                                    Budget
                                </span>

                                <strong>
                                    {formatCurrency(
                                        overall.budget
                                    )}
                                </strong>
                            </div>


                            <div>
                                <span>
                                    Remaining
                                </span>

                                <strong>
                                    {formatCurrency(
                                        overall.remaining
                                    )}
                                </strong>
                            </div>

                        </div>

                    </div>

                </div>


                {/* CATEGORY BUDGETS */}

                <div className="panel category-panel">

                    <div className="panel-header">

                        <div>
                            <h2>
                                Category Budgets
                            </h2>

                            <p>
                                Spending against
                                your limits
                            </p>
                        </div>

                        <button
                            className="text-button"
                            onClick={() =>
                                navigate(
                                    "/budgets"
                                )
                            }
                        >
                            View all →
                        </button>

                    </div>


                    {summaryLoading ? (

                        <div className="empty-state">
                            Loading...
                        </div>

                    ) : summary?.categories
                          ?.length ? (

                        <div className="category-list">

                            {summary.categories
                                .slice(0, 5)
                                .map(
                                    (
                                        category
                                    ) => {

                                        const percent =
                                            category.budget >
                                            0
                                                ? Math.min(
                                                      (category.spent /
                                                          category.budget) *
                                                          100,
                                                      100
                                                  )
                                                : 0;

                                        return (
                                            <div
                                                className="category-row"
                                                key={
                                                    category.category
                                                }
                                            >

                                                <div className="category-row-top">

                                                    <span>
                                                        {
                                                            category.category
                                                        }
                                                    </span>

                                                    <strong>
                                                        {formatCurrency(
                                                            category.spent
                                                        )}

                                                        <small>
                                                            {" "}
                                                            /{" "}
                                                            {formatCurrency(
                                                                category.budget
                                                            )}
                                                        </small>
                                                    </strong>

                                                </div>


                                                <div className="progress-track">

                                                    <div
                                                        className={`progress-fill ${
                                                            percent >=
                                                            100
                                                                ? "danger"
                                                                : percent >=
                                                                  80
                                                                ? "warning"
                                                                : ""
                                                        }`}
                                                        style={{
                                                            width:
                                                                `${percent}%`,
                                                        }}
                                                    />

                                                </div>

                                            </div>
                                        );
                                    }
                                )}

                        </div>

                    ) : (

                        <div className="empty-state">

                            <div className="empty-icon">
                                ₹
                            </div>

                            <h3>
                                No category budgets
                            </h3>

                            <p>
                                Create a category
                                budget to track
                                your spending.
                            </p>

                            <button
                                className="primary-button"
                                onClick={() =>
                                    navigate(
                                        "/budgets"
                                    )
                                }
                            >
                                Add Budget
                            </button>

                        </div>

                    )}

                </div>

            </div>


            {/* =========================
                RECENT EXPENSES
            ========================= */}

            <div className="panel recent-panel">

                <div className="panel-header">

                    <div>
                        <h2>
                            Recent Expenses
                        </h2>

                        <p>
                            Your latest
                            transactions
                        </p>
                    </div>

                    <button
                        className="text-button"
                        onClick={() =>
                            navigate(
                                "/expenses"
                            )
                        }
                    >
                        View all →
                    </button>

                </div>


                {loadingExpenses ? (

                    <div className="empty-state">
                        Loading expenses...
                    </div>

                ) : currentMonthExpenses.length ===
                  0 ? (

                    <div className="empty-state">

                        <div className="empty-icon">
                            ₹
                        </div>

                        <h3>
                            No expenses yet
                        </h3>

                        <p>
                            Add your first expense
                            to start tracking
                            your spending.
                        </p>

                        <button
                            className="primary-button"
                            onClick={() =>
                                navigate(
                                    "/expenses"
                                )
                            }
                        >
                            Add Expense
                        </button>

                    </div>

                ) : (

                    <div className="transaction-list">

                        {currentMonthExpenses
                            .slice(0, 5)
                            .map((expense) => (

                                <div
                                    className="transaction"
                                    key={
                                        expense._id
                                    }
                                >

                                    <div className="transaction-left">

                                        <div className="transaction-icon">
                                            {expense.category
                                                ?.charAt(
                                                    0
                                                )
                                                .toUpperCase()}
                                        </div>

                                        <div>

                                            <strong>
                                                {
                                                    expense.category
                                                }
                                            </strong>

                                            <span>
                                                {expense.description ||
                                                    expense.paymentMethod}
                                            </span>

                                        </div>

                                    </div>


                                    <div className="transaction-right">

                                        <strong>
                                            -{" "}
                                            {formatCurrency(
                                                expense.amount
                                            )}
                                        </strong>

                                        <span>
                                            {formatDate(
                                                expense.date
                                            )}
                                        </span>

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
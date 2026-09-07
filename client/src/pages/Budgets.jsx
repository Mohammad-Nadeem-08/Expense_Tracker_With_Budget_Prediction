import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import "../App.css";

const BUDGET_API = "http://localhost:5000/api/budgets";

const authConfig = (token) => ({
    headers: {
        Authorization: `Bearer ${token}`,
    },
});

const budgetCategories = [
    "Overall",
    "Food",
    "Transport",
    "Shopping",
    "Entertainment",
    "Bills",
    "Healthcare",
    "Education",
    "Other",
];

const initialBudgetForm = {
    amount: "",
    category: "",
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
};

function Budgets() {
    const { token } = useAuth();

    const [budgets, setBudgets] = useState([]);
    const [summary, setSummary] = useState(null);

    const [loading, setLoading] = useState(true);

    const [budgetModal, setBudgetModal] = useState(false);

    const [budgetForm, setBudgetForm] =
        useState(initialBudgetForm);

    const [editingBudgetId, setEditingBudgetId] =
        useState(null);

    const [message, setMessage] = useState("");

    const [selectedMonth, setSelectedMonth] =
        useState(new Date().getMonth() + 1);

    const [selectedYear, setSelectedYear] =
        useState(new Date().getFullYear());


    // =========================
    // MESSAGE
    // =========================

    const showMessage = (text) => {
        setMessage(text);

        setTimeout(() => {
            setMessage("");
        }, 3000);
    };


    // =========================
    // FETCH BUDGETS
    // =========================

    const fetchBudgets = async () => {
        if (!token) return;

        try {
            setLoading(true);

            const response = await axios.get(
                BUDGET_API,
                authConfig(token)
            );

            setBudgets(response.data);

        } catch (error) {
            console.error(error);

            showMessage(
                error.response?.data?.message ||
                    "Failed to load budgets."
            );
        } finally {
            setLoading(false);
        }
    };


    // =========================
    // FETCH SUMMARY
    // =========================

    const fetchSummary = async () => {
        if (!token) return;

        try {
            const response = await axios.get(
                `${BUDGET_API}/summary/${selectedMonth}/${selectedYear}`,
                authConfig(token)
            );

            setSummary(response.data);

        } catch (error) {
            console.error(error);

            setSummary(null);
        }
    };


    useEffect(() => {
        if (!token) return;

        fetchBudgets();
    }, [token]);


    useEffect(() => {
        if (!token) return;

        fetchSummary();
    }, [
        token,
        selectedMonth,
        selectedYear,
        budgets,
    ]);


    // =========================
    // FORM
    // =========================

    const handleBudgetChange = (e) => {
        const { name, value } = e.target;

        setBudgetForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };


    const openAddBudget = () => {
        setEditingBudgetId(null);

        setBudgetForm({
            amount: "",
            category: "",
            month: selectedMonth,
            year: selectedYear,
        });

        setBudgetModal(true);
    };


    const openEditBudget = (budget) => {
        setEditingBudgetId(budget._id);

        setBudgetForm({
            amount: String(budget.amount),
            category: budget.category,
            month: budget.month,
            year: budget.year,
        });

        setBudgetModal(true);
    };


    const closeBudgetModal = () => {
        setBudgetModal(false);

        setEditingBudgetId(null);

        setBudgetForm({
            ...initialBudgetForm,
            month: selectedMonth,
            year: selectedYear,
        });
    };


    // =========================
    // CREATE / UPDATE
    // =========================

    const handleBudgetSubmit = async (e) => {
        e.preventDefault();

        if (!token) return;

        try {
            const data = {
                amount: Number(budgetForm.amount),
                category: budgetForm.category,
                month: Number(budgetForm.month),
                year: Number(budgetForm.year),
            };


            if (editingBudgetId) {

                await axios.put(
                    `${BUDGET_API}/${editingBudgetId}`,
                    data,
                    authConfig(token)
                );

                showMessage(
                    "Budget updated successfully."
                );

            } else {

                await axios.post(
                    BUDGET_API,
                    data,
                    authConfig(token)
                );

                showMessage(
                    "Budget created successfully."
                );
            }


            closeBudgetModal();

            await fetchBudgets();

        } catch (error) {
            console.error(error);

            showMessage(
                error.response?.data?.message ||
                    "Failed to save budget."
            );
        }
    };


    // =========================
    // DELETE
    // =========================

    const handleDeleteBudget = async (id) => {

        const confirmed = window.confirm(
            "Are you sure you want to delete this budget?"
        );

        if (!confirmed) return;

        try {

            await axios.delete(
                `${BUDGET_API}/${id}`,
                authConfig(token)
            );

            showMessage(
                "Budget deleted successfully."
            );

            await fetchBudgets();

        } catch (error) {

            console.error(error);

            showMessage(
                error.response?.data?.message ||
                    "Failed to delete budget."
            );
        }
    };


    // =========================
    // MONTH FILTER
    // =========================

    const monthlyBudgets = useMemo(() => {

        return budgets.filter(
            (budget) =>
                Number(budget.month) ===
                    Number(selectedMonth) &&
                Number(budget.year) ===
                    Number(selectedYear)
        );

    }, [
        budgets,
        selectedMonth,
        selectedYear,
    ]);


    // =========================
    // HELPERS
    // =========================

    const formatCurrency = (amount) => {

        return `₹${Number(
            amount || 0
        ).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;

    };


    const monthName = new Date(
        selectedYear,
        selectedMonth - 1
    ).toLocaleString("en-IN", {
        month: "long",
    });


    const overallBudget =
        summary?.overall?.budget || 0;

    const overallSpent =
        summary?.overall?.spent || 0;

    const overallRemaining =
        summary?.overall?.remaining || 0;

    const overallPercentage =
        overallBudget > 0
            ? Math.min(
                (overallSpent / overallBudget) * 100,
                100
            )
            : 0;


    // =========================
    // PAGE
    // =========================

    return (
        <div>

            {/* HEADER */}

            <div className="page-heading">

                <div>

                    <p className="eyebrow">
                        FINANCIAL PLANNING
                    </p>

                    <h1>
                        Budgets
                    </h1>

                    <p className="page-description">
                        Set spending limits and track
                        your progress.
                    </p>

                </div>


                <button
                    className="primary-button"
                    onClick={openAddBudget}
                >
                    + Add Budget
                </button>

            </div>


            {/* MONTH SELECTOR */}

            <div className="budget-filter">

                <div>

                    <label>
                        Month
                    </label>

                    <select
                        value={selectedMonth}
                        onChange={(e) =>
                            setSelectedMonth(
                                Number(e.target.value)
                            )
                        }
                    >

                        {Array.from(
                            { length: 12 },
                            (_, index) => (
                                <option
                                    key={index + 1}
                                    value={index + 1}
                                >
                                    {new Date(
                                        selectedYear,
                                        index
                                    ).toLocaleString(
                                        "en-IN",
                                        {
                                            month: "long",
                                        }
                                    )}
                                </option>
                            )
                        )}

                    </select>

                </div>


                <div>

                    <label>
                        Year
                    </label>

                    <select
                        value={selectedYear}
                        onChange={(e) =>
                            setSelectedYear(
                                Number(e.target.value)
                            )
                        }
                    >

                        {[2025, 2026, 2027, 2028].map(
                            (year) => (

                                <option
                                    key={year}
                                    value={year}
                                >
                                    {year}
                                </option>

                            )
                        )}

                    </select>

                </div>

            </div>


            {/* OVERALL SUMMARY */}

            <div className="dashboard-cards">

                <div className="dashboard-card">

                    <span>
                        Overall Budget
                    </span>

                    <h2>
                        {formatCurrency(
                            overallBudget
                        )}
                    </h2>

                </div>


                <div className="dashboard-card">

                    <span>
                        Total Spent
                    </span>

                    <h2>
                        {formatCurrency(
                            overallSpent
                        )}
                    </h2>

                </div>


                <div className="dashboard-card">

                    <span>
                        Remaining
                    </span>

                    <h2>
                        {formatCurrency(
                            Math.max(
                                overallRemaining,
                                0
                            )
                        )}
                    </h2>

                </div>


                <div className="dashboard-card">

                    <span>
                        Budget Used
                    </span>

                    <h2>
                        {overallPercentage.toFixed(1)}%
                    </h2>

                </div>

            </div>


            {/* OVERALL PROGRESS */}

            <div className="dashboard-section">

                <div className="section-header">

                    <div>

                        <h2>
                            {monthName} {selectedYear}
                        </h2>

                        <p>
                            Overall spending progress
                        </p>

                    </div>


                    <strong>
                        {formatCurrency(
                            overallSpent
                        )}{" "}
                        /{" "}
                        {formatCurrency(
                            overallBudget
                        )}
                    </strong>

                </div>


                <div className="progress-container">

                    <div
                        className="progress-bar"
                        style={{
                            width: `${overallPercentage}%`,
                        }}
                    />

                </div>

            </div>


            {/* CATEGORY BUDGETS */}

            <div className="dashboard-section">

                <div className="section-header">

                    <div>

                        <h2>
                            Category Budgets
                        </h2>

                        <p>
                            Budget vs actual spending
                        </p>

                    </div>

                </div>


                {summary?.categories?.length > 0 ? (

                    <div className="category-list">

                        {summary.categories.map(
                            (item) => {

                                const percentage =
                                    item.budget > 0
                                        ? Math.min(
                                            (item.spent /
                                                item.budget) *
                                                100,
                                            100
                                        )
                                        : 0;

                                return (
                                    <div
                                        className="category-item"
                                        key={item.category}
                                    >

                                        <div className="category-info">

                                            <strong>
                                                {item.category}
                                            </strong>

                                            <span>
                                                {formatCurrency(
                                                    item.spent
                                                )}
                                                {" / "}
                                                {formatCurrency(
                                                    item.budget
                                                )}

                                            </span>

                                        </div>


                                        <div className="category-progress">

                                            <div
                                                style={{
                                                    width: `${percentage}%`,
                                                }}
                                            />

                                        </div>


                                        <div className="category-meta">

                                            <span>
                                                Remaining:{" "}
                                                {formatCurrency(
                                                    item.remaining
                                                )}
                                            </span>

                                            <span>
                                                {percentage.toFixed(
                                                    1
                                                )}
                                                %
                                            </span>

                                        </div>

                                    </div>
                                );
                            }
                        )}

                    </div>

                ) : (

                    <div className="empty-state">

                        No category budgets for{" "}
                        {monthName} {selectedYear}.

                    </div>

                )}

            </div>


            {/* BUDGET LIST */}

            <div className="dashboard-section">

                <div className="section-header">

                    <div>

                        <h2>
                            Your Budgets
                        </h2>

                        <p>
                            {monthlyBudgets.length}{" "}
                            budget
                            {monthlyBudgets.length !==
                            1
                                ? "s"
                                : ""}{" "}
                            for this month
                        </p>

                    </div>

                </div>


                {loading ? (

                    <div className="empty-state">
                        Loading budgets...
                    </div>

                ) : monthlyBudgets.length === 0 ? (

                    <div className="empty-state">

                        <h3>
                            No budgets found
                        </h3>

                        <p>
                            Create a budget to start
                            tracking your spending.
                        </p>

                        <button
                            className="primary-button"
                            onClick={openAddBudget}
                        >
                            Add Budget
                        </button>

                    </div>

                ) : (

                    <div className="budget-list">

                        {monthlyBudgets.map(
                            (budget) => {

                                const categorySummary =
                                    summary?.categories?.find(
                                        (item) =>
                                            item.category ===
                                            budget.category
                                    );

                                const spent =
                                    budget.category ===
                                    "Overall"
                                        ? overallSpent
                                        : categorySummary?.spent ||
                                          0;

                                const remaining =
                                    Number(
                                        budget.amount
                                    ) - Number(spent);

                                const percentage =
                                    Number(
                                        budget.amount
                                    ) > 0
                                        ? Math.min(
                                            (Number(
                                                spent
                                            ) /
                                                Number(
                                                    budget.amount
                                                )) *
                                                100,
                                            100
                                        )
                                        : 0;

                                return (
                                    <div
                                        className="budget-item"
                                        key={budget._id}
                                    >

                                        <div className="budget-item-main">

                                            <div>

                                                <strong>
                                                    {
                                                        budget.category
                                                    }
                                                </strong>

                                                <span>
                                                    {monthName}{" "}
                                                    {
                                                        budget.year
                                                    }
                                                </span>

                                            </div>


                                            <div className="budget-amount">

                                                <strong>
                                                    {formatCurrency(
                                                        budget.amount
                                                    )}
                                                </strong>

                                                <span>
                                                    spent{" "}
                                                    {formatCurrency(
                                                        spent
                                                    )}
                                                </span>

                                            </div>

                                        </div>


                                        <div className="category-progress">

                                            <div
                                                style={{
                                                    width: `${percentage}%`,
                                                }}
                                            />

                                        </div>


                                        <div className="budget-item-footer">

                                            <span>
                                                Remaining:{" "}
                                                {formatCurrency(
                                                    remaining
                                                )}
                                            </span>


                                            <div className="row-actions">

                                                <button
                                                    onClick={() =>
                                                        openEditBudget(
                                                            budget
                                                        )
                                                    }
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    className="danger-text"
                                                    onClick={() =>
                                                        handleDeleteBudget(
                                                            budget._id
                                                        )
                                                    }
                                                >
                                                    Delete
                                                </button>

                                            </div>

                                        </div>

                                    </div>
                                );
                            }
                        )}

                    </div>

                )}

            </div>


            {/* =========================
                BUDGET MODAL
            ========================= */}

            {budgetModal && (

                <div
                    className="modal-overlay"
                    onMouseDown={(e) => {

                        if (
                            e.target ===
                            e.currentTarget
                        ) {
                            closeBudgetModal();
                        }

                    }}
                >

                    <div className="modal">

                        <div className="modal-header">

                            <div>

                                <span className="modal-eyebrow">
                                    BUDGET
                                </span>

                                <h2>

                                    {editingBudgetId
                                        ? "Edit Budget"
                                        : "Add Budget"}

                                </h2>

                            </div>


                            <button
                                className="close-button"
                                onClick={
                                    closeBudgetModal
                                }
                            >
                                ×
                            </button>

                        </div>


                        <form
                            onSubmit={
                                handleBudgetSubmit
                            }
                        >

                            <div className="form-grid">


                                {/* AMOUNT */}

                                <div className="form-group full">

                                    <label>
                                        Budget Amount
                                    </label>

                                    <div className="amount-input">

                                        <span>
                                            ₹
                                        </span>

                                        <input
                                            type="number"
                                            name="amount"
                                            value={
                                                budgetForm.amount
                                            }
                                            onChange={
                                                handleBudgetChange
                                            }
                                            placeholder="0.00"
                                            min="0.01"
                                            step="0.01"
                                            required
                                        />

                                    </div>

                                </div>


                                {/* CATEGORY */}

                                <div className="form-group">

                                    <label>
                                        Category
                                    </label>

                                    <select
                                        name="category"
                                        value={
                                            budgetForm.category
                                        }
                                        onChange={
                                            handleBudgetChange
                                        }
                                        required
                                    >

                                        <option value="">
                                            Select category
                                        </option>

                                        {budgetCategories.map(
                                            (category) => (

                                                <option
                                                    key={category}
                                                    value={category}
                                                >
                                                    {category}
                                                </option>

                                            )
                                        )}

                                    </select>

                                </div>


                                {/* MONTH */}

                                <div className="form-group">

                                    <label>
                                        Month
                                    </label>

                                    <select
                                        name="month"
                                        value={
                                            budgetForm.month
                                        }
                                        onChange={
                                            handleBudgetChange
                                        }
                                        required
                                    >

                                        {Array.from(
                                            {
                                                length: 12,
                                            },
                                            (_, index) => (

                                                <option
                                                    key={
                                                        index + 1
                                                    }
                                                    value={
                                                        index + 1
                                                    }
                                                >
                                                    {new Date(
                                                        budgetForm.year,
                                                        index
                                                    ).toLocaleString(
                                                        "en-IN",
                                                        {
                                                            month:
                                                                "long",
                                                        }
                                                    )}
                                                </option>

                                            )
                                        )}

                                    </select>

                                </div>


                                {/* YEAR */}

                                <div className="form-group">

                                    <label>
                                        Year
                                    </label>

                                    <input
                                        type="number"
                                        name="year"
                                        value={
                                            budgetForm.year
                                        }
                                        onChange={
                                            handleBudgetChange
                                        }
                                        min="2000"
                                        required
                                    />

                                </div>

                            </div>


                            <div className="modal-actions">

                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={
                                        closeBudgetModal
                                    }
                                >
                                    Cancel
                                </button>


                                <button
                                    type="submit"
                                    className="primary-button"
                                >

                                    {editingBudgetId
                                        ? "Save Changes"
                                        : "Create Budget"}

                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}


            {/* TOAST */}

            {message && (

                <div className="toast">

                    <span>
                        ✓
                    </span>

                    {message}

                </div>

            )}

        </div>
    );
}

export default Budgets;
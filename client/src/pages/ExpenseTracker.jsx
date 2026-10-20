import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/useAuth";
import axios from "axios";
import "../App.css";

const EXPENSE_API = "http://localhost:5000/api/expenses";
const BUDGET_API = "http://localhost:5000/api/budgets";

const authConfig = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const categories = [
  "Food",
  "Transport",
  "Shopping",
  "Entertainment",
  "Bills",
  "Healthcare",
  "Education",
  "Other",
];

const paymentMethods = [
  "Cash",
  "UPI",
  "Card",
  "Bank Transfer",
];

const initialExpenseForm = {
  amount: "",
  category: "",
  date: new Date().toISOString().split("T")[0],
  paymentMethod: "",
  description: "",
};

const initialBudgetForm = {
  amount: "",
  category: "",
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
};

function ExpenseTracker(){
  // =========================
  // GENERAL
  // =========================
  const { user, token, logout } = useAuth();
  const [activePage, setActivePage] = useState("dashboard");
  const [message, setMessage] = useState("");

  // =========================
  // EXPENSES
  // =========================

  const [expenses, setExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [expenseModal, setExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState(initialExpenseForm);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [expenseSearch, setExpenseSearch] = useState("");

  // =========================
  // BUDGETS
  // =========================

  const [budgets, setBudgets] = useState([]);
  const [loadingBudgets, setLoadingBudgets] = useState(true);
  const [budgetModal, setBudgetModal] = useState(false);
  const [budgetForm, setBudgetForm] = useState(initialBudgetForm);
  const [editingBudgetId, setEditingBudgetId] = useState(null);

  // =========================
  // SUMMARY
  // =========================

  const [summaryMonth, setSummaryMonth] = useState(
    new Date().getMonth() + 1
  );

  const [summaryYear, setSummaryYear] = useState(
    new Date().getFullYear()
  );

  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const showMessage = useCallback((text) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 3000);
  }, []);

  // =========================
  // FETCH EXPENSES
  // =========================

  const fetchExpenses = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(EXPENSE_API, authConfig(token));
      setExpenses(response.data);
    } catch (error) {
      console.error(error);
      showMessage("Failed to load expenses.");
    } finally {
      setLoadingExpenses(false);
    }
  }, [showMessage, token]);

  // =========================
  // FETCH BUDGETS
  // =========================

  const fetchBudgets = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(BUDGET_API, authConfig(token));
      setBudgets(response.data);
    } catch (error) {
      console.error(error);
      showMessage("Failed to load budgets.");
    } finally {
      setLoadingBudgets(false);
    }
  }, [showMessage, token]);

  // =========================
  // FETCH SUMMARY
  // =========================

  const fetchBudgetSummary = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(
        `${BUDGET_API}/summary/${summaryMonth}/${summaryYear}`,
        authConfig(token)
      );

      setSummary(response.data);
    } catch (error) {
      console.error(error);
      showMessage("Failed to load budget summary.");
    } finally {
      setSummaryLoading(false);
    }
  }, [showMessage, summaryMonth, summaryYear, token]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchExpenses();
      void fetchBudgets();
    });
  }, [fetchBudgets, fetchExpenses]);

  useEffect(() => {
    queueMicrotask(() => { void fetchBudgetSummary(); });
  }, [fetchBudgetSummary]);

  // =========================
  // MESSAGE
  // =========================

  // =========================
  // EXPENSE FORM
  // =========================

  const handleExpenseChange = (e) => {
    const { name, value } = e.target;

    setExpenseForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const openAddExpense = () => {
    setEditingExpenseId(null);
    setExpenseForm(initialExpenseForm);
    setExpenseModal(true);
  };

  const openEditExpense = (expense) => {
    setEditingExpenseId(expense._id);

    setExpenseForm({
      amount: String(expense.amount),
      category: expense.category,
      date: new Date(expense.date).toISOString().split("T")[0],
      paymentMethod: expense.paymentMethod,
      description: expense.description || "",
    });

    setExpenseModal(true);
  };

  const closeExpenseModal = () => {
    setExpenseModal(false);
    setEditingExpenseId(null);
    setExpenseForm(initialExpenseForm);
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();

    try {
      const data = {
        ...expenseForm,
        amount: Number(expenseForm.amount),
      };

      if (editingExpenseId) {
        await axios.put(
          `${EXPENSE_API}/${editingExpenseId}`,
          data,
          authConfig(token)
        );

        showMessage("Expense updated successfully.");
      } else {
        await axios.post(EXPENSE_API, data, authConfig(token));

        showMessage("Expense added successfully.");
      }

      closeExpenseModal();

      await fetchExpenses();
      await fetchBudgetSummary();
    } catch (error) {
      console.error(error);

      showMessage(
        error.response?.data?.message ||
          "Failed to save expense."
      );
    }
  };

  const handleDeleteExpense = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this expense?"
    );

    if (!confirmed) return;

    try {
      await axios.delete(`${EXPENSE_API}/${id}`, authConfig(token));

      showMessage("Expense deleted successfully.");

      await fetchExpenses();
      await fetchBudgetSummary();
    } catch (error) {
      console.error(error);

      showMessage("Failed to delete expense.");
    }
  };

  // =========================
  // BUDGET FORM
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
      ...initialBudgetForm,
      month: summaryMonth,
      year: summaryYear,
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
    setBudgetForm(initialBudgetForm);
  };

  const handleBudgetSubmit = async (e) => {
    e.preventDefault();

    try {
      const data = {
        ...budgetForm,
        amount: Number(budgetForm.amount),
        month: Number(budgetForm.month),
        year: Number(budgetForm.year),
      };

      if (editingBudgetId) {
        await axios.put(
          `${BUDGET_API}/${editingBudgetId}`,
          data,
          authConfig(token)
        );

        showMessage("Budget updated successfully.");
      } else {
        await axios.post(BUDGET_API, data, authConfig(token));

        showMessage("Budget added successfully.");
      }

      closeBudgetModal();

      await fetchBudgets();
      await fetchBudgetSummary();
    } catch (error) {
      console.error(error);

      showMessage(
        error.response?.data?.message ||
          "Failed to save budget."
      );
    }
  };

  const handleDeleteBudget = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this budget?"
    );

    if (!confirmed) return;

    try {
      await axios.delete(`${BUDGET_API}/${id}`, authConfig(token));

      showMessage("Budget deleted successfully.");

      await fetchBudgets();
      await fetchBudgetSummary();
    } catch (error) {
      console.error(error);

      showMessage("Failed to delete budget.");
    }
  };

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
    return `₹${Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // =========================
  // FILTERED EXPENSES
  // =========================

  const filteredExpenses = useMemo(() => {
    const search = expenseSearch.toLowerCase().trim();

    if (!search) return expenses;

    return expenses.filter((expense) => {
      return (
        expense.category?.toLowerCase().includes(search) ||
        expense.description?.toLowerCase().includes(search) ||
        expense.paymentMethod?.toLowerCase().includes(search) ||
        String(expense.amount).includes(search)
      );
    });
  }, [expenses, expenseSearch]);

  // =========================
  // CURRENT MONTH EXPENSES
  // =========================

  const currentMonthExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const date = new Date(expense.date);

      return (
        date.getMonth() + 1 === summaryMonth &&
        date.getFullYear() === summaryYear
      );
    });
  }, [expenses, summaryMonth, summaryYear]);

  // =========================
  // NAVIGATION
  // =========================

  const navigate = (page) => {
    setActivePage(page);
  };

  // =========================
  // DASHBOARD
  // =========================

  const renderDashboard = () => {
    const overall = summary?.overall || {
      budget: 0,
      spent: 0,
      remaining: 0,
    };

    const usage =
      overall.budget > 0
        ? Math.min(
            (overall.spent / overall.budget) * 100,
            100
          )
        : 0;

    return (
      <>
        <div className="page-heading">
          <div>
            <p className="eyebrow">OVERVIEW</p>

            <h1>
              Good evening, {user?.name || "User"} <span>👋</span>
            </h1>

            <p className="page-description">
              Here's your financial overview for{" "}
              {getMonthName(summaryMonth)}{" "}
              {summaryYear}.
            </p>
          </div>

          <div className="heading-actions">
            <select
              value={summaryMonth}
              onChange={(e) =>
                setSummaryMonth(Number(e.target.value))
              }
              className="month-select"
            >
              {Array.from(
                { length: 12 },
                (_, index) => (
                  <option
                    key={index + 1}
                    value={index + 1}
                  >
                    {getMonthName(index + 1)}
                  </option>
                )
              )}
            </select>

            <button
              className="primary-button"
              onClick={openAddExpense}
            >
              + Add Expense
            </button>
          </div>
        </div>

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
                {formatCurrency(overall.budget)}
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
                {formatCurrency(overall.spent)}
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
                {formatCurrency(overall.remaining)}
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

        <div className="dashboard-grid">
          <div className="panel spending-panel">
            <div className="panel-header">
              <div>
                <h2>Spending Overview</h2>
                <p>
                  Your expenses this month
                </p>
              </div>
            </div>

            <div className="spending-content">
              <div className="donut-wrapper">
                <div
                  className="donut"
                  style={{
                    "--usage": `${usage}%`,
                  }}
                >
                  <div className="donut-center">
                    <strong>
                      {usage.toFixed(0)}%
                    </strong>

                    <span>used</span>
                  </div>
                </div>
              </div>

              <div className="spending-details">
                <div>
                  <span>Spent</span>
                  <strong>
                    {formatCurrency(
                      overall.spent
                    )}
                  </strong>
                </div>

                <div>
                  <span>Budget</span>
                  <strong>
                    {formatCurrency(
                      overall.budget
                    )}
                  </strong>
                </div>

                <div>
                  <span>Remaining</span>
                  <strong>
                    {formatCurrency(
                      overall.remaining
                    )}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          <div className="panel category-panel">
            <div className="panel-header">
              <div>
                <h2>Category Budgets</h2>
                <p>
                  Spending against your limits
                </p>
              </div>

              <button
                className="text-button"
                onClick={() =>
                  navigate("budgets")
                }
              >
                View all →
              </button>
            </div>

            {summaryLoading ? (
              <div className="empty-state">
                Loading...
              </div>
            ) : summary?.categories?.length ? (
              <div className="category-list">
                {summary.categories
                  .slice(0, 5)
                  .map((category) => {
                    const percent =
                      category.budget > 0
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
                        key={category.category}
                      >
                        <div className="category-row-top">
                          <span>
                            {category.category}
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
                              percent >= 100
                                ? "danger"
                                : percent >= 80
                                ? "warning"
                                : ""
                            }`}
                            style={{
                              width: `${percent}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="empty-state">
                No category budgets yet.
              </div>
            )}
          </div>
        </div>

        <div className="panel recent-panel">
          <div className="panel-header">
            <div>
              <h2>Recent Expenses</h2>
              <p>
                Your latest transactions
              </p>
            </div>

            <button
              className="text-button"
              onClick={() =>
                navigate("expenses")
              }
            >
              View all →
            </button>
          </div>

          {loadingExpenses ? (
            <div className="empty-state">
              Loading expenses...
            </div>
          ) : currentMonthExpenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                ₹
              </div>

              <h3>No expenses yet</h3>

              <p>
                Add your first expense to start
                tracking your spending.
              </p>

              <button
                className="primary-button"
                onClick={openAddExpense}
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
                    key={expense._id}
                  >
                    <div className="transaction-left">
                      <div className="transaction-icon">
                        {expense.category
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <strong>
                          {expense.category}
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
      </>
    );
  };

  // =========================
  // EXPENSES PAGE
  // =========================

  const renderExpenses = () => {
    return (
      <>
        <div className="page-heading">
          <div>
            <p className="eyebrow">
              TRANSACTIONS
            </p>

            <h1>Expenses</h1>

            <p className="page-description">
              Manage and track all your expenses.
            </p>
          </div>

          <button
            className="primary-button"
            onClick={openAddExpense}
          >
            + Add Expense
          </button>
        </div>

        <div className="panel">
          <div className="table-toolbar">
            <div className="search-box">
              <span>⌕</span>

              <input
                type="text"
                placeholder="Search expenses..."
                value={expenseSearch}
                onChange={(e) =>
                  setExpenseSearch(e.target.value)
                }
              />
            </div>

            <span className="result-count">
              {filteredExpenses.length} expenses
            </span>
          </div>

          {loadingExpenses ? (
            <div className="empty-state">
              Loading expenses...
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                ₹
              </div>

              <h3>No expenses found</h3>

              <p>
                Try a different search or add a
                new expense.
              </p>
            </div>
          ) : (
            <div className="expense-table">
              <div className="table-header">
                <span>EXPENSE</span>
                <span>CATEGORY</span>
                <span>DATE</span>
                <span>PAYMENT</span>
                <span>AMOUNT</span>
                <span></span>
              </div>

              {filteredExpenses.map(
                (expense) => (
                  <div
                    className="table-row"
                    key={expense._id}
                  >
                    <div className="table-expense">
                      <div className="transaction-icon">
                        {expense.category
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div>
                        <strong>
                          {expense.description ||
                            expense.category}
                        </strong>

                        {expense.description && (
                          <span>
                            {expense.category}
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="table-category">
                      {expense.category}
                    </span>

                    <span>
                      {formatDate(
                        expense.date
                      )}
                    </span>

                    <span>
                      {expense.paymentMethod}
                    </span>

                    <strong>
                      {formatCurrency(
                        expense.amount
                      )}
                    </strong>

                    <div className="row-actions">
                      <button
                        onClick={() =>
                          openEditExpense(
                            expense
                          )
                        }
                      >
                        Edit
                      </button>

                      <button
                        className="danger-text"
                        onClick={() =>
                          handleDeleteExpense(
                            expense._id
                          )
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </>
    );
  };

  // =========================
  // BUDGETS PAGE
  // =========================

  const renderBudgets = () => {
    return (
      <>
        <div className="page-heading">
          <div>
            <p className="eyebrow">
              PLANNING
            </p>

            <h1>Budgets</h1>

            <p className="page-description">
              Set spending limits and stay on
              track.
            </p>
          </div>

          <button
            className="primary-button"
            onClick={openAddBudget}
          >
            + Add Budget
          </button>
        </div>

        <div className="budget-filter">
          <select
            value={summaryMonth}
            onChange={(e) =>
              setSummaryMonth(
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
                  {getMonthName(index + 1)}
                </option>
              )
            )}
          </select>

          <input
            type="number"
            value={summaryYear}
            onChange={(e) =>
              setSummaryYear(
                Number(e.target.value)
              )
            }
            min="2000"
          />
        </div>

        <div className="stats-grid budget-stats">
          <div className="stat-card">
            <div className="stat-icon purple">
              ₹
            </div>

            <div>
              <span className="stat-label">
                Total Budget
              </span>

              <strong className="stat-value">
                {formatCurrency(
                  summary?.overall?.budget
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
                Spent
              </span>

              <strong className="stat-value">
                {formatCurrency(
                  summary?.overall?.spent
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
                  summary?.overall?.remaining
                )}
              </strong>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Budget Breakdown</h2>

              <p>
                {getMonthName(summaryMonth)}{" "}
                {summaryYear}
              </p>
            </div>
          </div>

          {loadingBudgets ? (
            <div className="empty-state">
              Loading budgets...
            </div>
          ) : budgets.filter(
              (budget) =>
                budget.month ===
                  summaryMonth &&
                budget.year === summaryYear
            ).length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                ₹
              </div>

              <h3>No budgets for this month</h3>

              <p>
                Create a budget to start
                managing your spending.
              </p>

              <button
                className="primary-button"
                onClick={openAddBudget}
              >
                Add Budget
              </button>
            </div>
          ) : (
            <div className="budget-list-large">
              {budgets
                .filter(
                  (budget) =>
                    budget.month ===
                      summaryMonth &&
                    budget.year ===
                      summaryYear
                )
                .map((budget) => {
                  const categorySummary =
                    summary?.categories?.find(
                      (item) =>
                        item.category ===
                        budget.category
                    );

                  const spent =
                    budget.category ===
                    "Overall"
                      ? summary?.overall?.spent ||
                        0
                      : categorySummary?.spent ||
                        0;

                  const percent =
                    budget.amount > 0
                      ? Math.min(
                          (spent /
                            budget.amount) *
                            100,
                          100
                        )
                      : 0;

                  return (
                    <div
                      className="budget-card"
                      key={budget._id}
                    >
                      <div className="budget-card-top">
                        <div className="budget-title">
                          <div className="budget-icon">
                            {budget.category ===
                            "Overall"
                              ? "₹"
                              : budget.category
                                  .charAt(0)
                                  .toUpperCase()}
                          </div>

                          <div>
                            <h3>
                              {budget.category}
                            </h3>

                            <span>
                              {formatCurrency(
                                spent
                              )}{" "}
                              spent of{" "}
                              {formatCurrency(
                                budget.amount
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="budget-card-actions">
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

                      <div className="large-progress">
                        <div
                          className={`progress-fill ${
                            percent >= 100
                              ? "danger"
                              : percent >= 80
                              ? "warning"
                              : ""
                          }`}
                          style={{
                            width: `${percent}%`,
                          }}
                        />
                      </div>

                      <div className="budget-card-bottom">
                        <span>
                          {percent.toFixed(0)}%
                          used
                        </span>

                        <strong>
                          {formatCurrency(
                            budget.amount -
                              spent
                          )}{" "}
                          remaining
                        </strong>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </>
    );
  };

  // =========================
  // PREDICTION PAGE
  // =========================

  const renderPrediction = () => {
    return (
      <>
        <div className="page-heading">
          <div>
            <p className="eyebrow">
              SMART INSIGHTS
            </p>

            <h1>Budget Prediction</h1>

            <p className="page-description">
              Understand where your spending is
              heading.
            </p>
          </div>
        </div>

        <div className="prediction-placeholder">
          <div className="prediction-icon">
            ✦
          </div>

          <h2>
            Prediction is coming next
          </h2>

          <p>
            We'll analyze your historical
            expenses, spending patterns and
            current budget usage to estimate
            your future spending.
          </p>

          <div className="prediction-steps">
            <div>
              <span>01</span>
              <strong>
                Analyze spending history
              </strong>
            </div>

            <div>
              <span>02</span>
              <strong>
                Identify spending patterns
              </strong>
            </div>

            <div>
              <span>03</span>
              <strong>
                Predict future spending
              </strong>
            </div>
          </div>
        </div>
      </>
    );
  };

  // =========================
  // PAGE CONTENT
  // =========================

  const renderPage = () => {
    switch (activePage) {
      case "expenses":
        return renderExpenses();

      case "budgets":
        return renderBudgets();

      case "prediction":
        return renderPrediction();

      default:
        return renderDashboard();
    }
  };

  return (
    <div className="app-shell">

      {/* =========================
          SIDEBAR
      ========================= */}

      <aside className="sidebar">

        <div className="brand">
          <div className="brand-icon">
            ₹
          </div>

          <div>
            <strong>
              SmartSpend
            </strong>

            <span>
              Expense Tracker
            </span>
          </div>
        </div>

        <nav className="navigation">

          <p className="nav-label">
            MENU
          </p>

          <button
            className={
              activePage === "dashboard"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              navigate("dashboard")
            }
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            className={
              activePage === "expenses"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              navigate("expenses")
            }
          >
            <span>↗</span>
            Expenses
          </button>

          <button
            className={
              activePage === "budgets"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              navigate("budgets")
            }
          >
            <span>◫</span>
            Budgets
          </button>

          <p className="nav-label insights-label">
            INSIGHTS
          </p>

          <button
            className={
              activePage === "prediction"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() =>
              navigate("prediction")
            }
          >
            <span>✦</span>
            Prediction
            <em>Soon</em>
          </button>

        </nav>

        <div className="sidebar-bottom">

          <div className="user-card">
            <div className="avatar">
              {(user?.name || "U").charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>
                {user?.name || "User"}
              </strong>

              <span>
                {user?.email || "Personal Account"}
              </span>
            </div>

            <button
              type="button"
              onClick={logout}
              className="logout-button"
            >
              Logout
            </button>
          </div>

        </div>

      </aside>

      {/* =========================
          MAIN
      ========================= */}

      <main className="main-content">

        {renderPage()}

      </main>

      {/* =========================
          MESSAGE
      ========================= */}

      {message && (
        <div className="toast">
          <span>✓</span>
          {message}
        </div>
      )}

      {/* =========================
          EXPENSE MODAL
      ========================= */}

      {expenseModal && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeExpenseModal();
            }
          }}
        >
          <div className="modal">

            <div className="modal-header">

              <div>
                <span className="modal-eyebrow">
                  TRANSACTION
                </span>

                <h2>
                  {editingExpenseId
                    ? "Edit Expense"
                    : "Add Expense"}
                </h2>
              </div>

              <button
                className="close-button"
                onClick={
                  closeExpenseModal
                }
              >
                ×
              </button>

            </div>

            <form
              onSubmit={
                handleExpenseSubmit
              }
            >

              <div className="form-grid">

                <div className="form-group full">
                  <label>
                    Amount
                  </label>

                  <div className="amount-input">
                    <span>₹</span>

                    <input
                      type="number"
                      name="amount"
                      value={
                        expenseForm.amount
                      }
                      onChange={
                        handleExpenseChange
                      }
                      placeholder="0.00"
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    Category
                  </label>

                  <select
                    name="category"
                    value={
                      expenseForm.category
                    }
                    onChange={
                      handleExpenseChange
                    }
                    required
                  >
                    <option value="">
                      Select category
                    </option>

                    {categories.map(
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

                <div className="form-group">
                  <label>
                    Date
                  </label>

                  <input
                    type="date"
                    name="date"
                    value={
                      expenseForm.date
                    }
                    onChange={
                      handleExpenseChange
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Payment Method
                  </label>

                  <select
                    name="paymentMethod"
                    value={
                      expenseForm.paymentMethod
                    }
                    onChange={
                      handleExpenseChange
                    }
                    required
                  >
                    <option value="">
                      Select method
                    </option>

                    {paymentMethods.map(
                      (method) => (
                        <option
                          key={method}
                          value={method}
                        >
                          {method}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    Description
                  </label>

                  <input
                    type="text"
                    name="description"
                    value={
                      expenseForm.description
                    }
                    onChange={
                      handleExpenseChange
                    }
                    placeholder="What was this for?"
                  />
                </div>

              </div>

              <div className="modal-actions">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    closeExpenseModal
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  {editingExpenseId
                    ? "Save Changes"
                    : "Add Expense"}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

      {/* =========================
          BUDGET MODAL
      ========================= */}

      {budgetModal && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeBudgetModal();
            }
          }}
        >
          <div className="modal">

            <div className="modal-header">

              <div>
                <span className="modal-eyebrow">
                  PLANNING
                </span>

                <h2>
                  {editingBudgetId
                    ? "Edit Budget"
                    : "Create Budget"}
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

                <div className="form-group full">
                  <label>
                    Budget Amount
                  </label>

                  <div className="amount-input">
                    <span>₹</span>

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

                <div className="form-group full">
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

                    <option value="Overall">
                      Overall Budget
                    </option>

                    {categories.map(
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
                      { length: 12 },
                      (_, index) => (
                        <option
                          key={index + 1}
                          value={index + 1}
                        >
                          {getMonthName(
                            index + 1
                          )}
                        </option>
                      )
                    )}
                  </select>
                </div>

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

    </div>
  );
}

export default ExpenseTracker;

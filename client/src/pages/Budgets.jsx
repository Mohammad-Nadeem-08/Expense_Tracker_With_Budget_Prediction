import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconClose,
  IconCheck,
  IconBudgets,
  IconExpenses,
  IconTrendingUp,
} from "../components/Icons";
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
  const [budgetForm, setBudgetForm] = useState(initialBudgetForm);
  const [editingBudgetId, setEditingBudgetId] = useState(null);

  const [message, setMessage] = useState("");

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => {
      setMessage("");
    }, 3000);
  };

  const fetchBudgets = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await axios.get(BUDGET_API, authConfig(token));
      setBudgets(response.data.data || response.data);
    } catch (error) {
      console.error(error);
      showMessage(
        error.response?.data?.message || "Failed to load budgets."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    if (!token) return;
    try {
      const response = await axios.get(
        `${BUDGET_API}/summary/${selectedMonth}/${selectedYear}`,
        authConfig(token)
      );
      setSummary(response.data.data || response.data);
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
  }, [token, selectedMonth, selectedYear, budgets]);

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
        showMessage("Budget updated successfully.");
      } else {
        await axios.post(BUDGET_API, data, authConfig(token));
        showMessage("Budget created successfully.");
      }

      closeBudgetModal();
      await fetchBudgets();
    } catch (error) {
      console.error(error);
      showMessage(
        error.response?.data?.message || "Failed to save budget."
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
    } catch (error) {
      console.error(error);
      showMessage(
        error.response?.data?.message || "Failed to delete budget."
      );
    }
  };

  const monthlyBudgets = useMemo(() => {
    return budgets.filter(
      (budget) =>
        Number(budget.month) === Number(selectedMonth) &&
        Number(budget.year) === Number(selectedYear)
    );
  }, [budgets, selectedMonth, selectedYear]);

  const formatCurrency = (amount) => {
    return `₹${Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString(
    "en-IN",
    { month: "long" }
  );

  const overallBudget = summary?.overall?.budget || 0;
  const overallSpent = summary?.overall?.spent || 0;
  const overallRemaining = summary?.overall?.remaining || 0;
  const overallPercentage =
    overallBudget > 0
      ? Math.min((overallSpent / overallBudget) * 100, 100)
      : 0;

  return (
    <div className="dashboard-page">
      {/* TOAST MESSAGE */}
      {message && (
        <div className="toast-message">
          <IconCheck size={18} />
          <span>{message}</span>
        </div>
      )}

      {/* PAGE HEADER */}
      <div className="page-heading">
        <div>
          <p className="eyebrow">FINANCIAL PLANNING</p>
          <h1>Budgets</h1>
          <p className="page-description">
            Set spending limits and track your monthly budget progress.
          </p>
        </div>
        <div className="heading-actions">
          <button className="primary-button" onClick={openAddBudget}>
            <IconPlus size={18} /> Add Budget
          </button>
        </div>
      </div>

      {/* MONTH / YEAR SELECTOR */}
      <div className="panel" style={{ padding: "1rem 1.25rem" }}>
        <div className="budget-filter">
          <div>
            <label>Month:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {new Date(selectedYear, index).toLocaleString("en-IN", {
                    month: "long",
                  })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>Year:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {[2025, 2026, 2027, 2028].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* OVERALL SUMMARY STATS */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon purple">
            <IconBudgets size={22} />
          </div>
          <div>
            <span className="stat-label">Overall Budget</span>
            <strong className="stat-value">{formatCurrency(overallBudget)}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon orange">
            <IconExpenses size={22} />
          </div>
          <div>
            <span className="stat-label">Total Spent</span>
            <strong className="stat-value">{formatCurrency(overallSpent)}</strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <IconCheck size={22} />
          </div>
          <div>
            <span className="stat-label">Remaining</span>
            <strong className="stat-value">
              {formatCurrency(Math.max(overallRemaining, 0))}
            </strong>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon blue">
            <IconTrendingUp size={22} />
          </div>
          <div>
            <span className="stat-label">Budget Used</span>
            <strong className="stat-value">{overallPercentage.toFixed(1)}%</strong>
          </div>
        </div>
      </div>

      {/* OVERALL PROGRESS PANEL */}
      <div className="dashboard-section">
        <div className="section-header">
          <div>
            <h2>
              {monthName} {selectedYear} Budget Progress
            </h2>
            <p>Overall monthly spending timeline</p>
          </div>
          <strong style={{ fontSize: "16px", color: "var(--color-text-dark)" }}>
            {formatCurrency(overallSpent)} / {formatCurrency(overallBudget)}
          </strong>
        </div>

        <div className="progress-container">
          <div
            className="progress-bar"
            style={{
              width: `${overallPercentage}%`,
              backgroundColor:
                overallPercentage >= 100
                  ? "var(--color-danger)"
                  : overallPercentage >= 80
                  ? "var(--color-warning)"
                  : "var(--color-primary)",
            }}
          />
        </div>
      </div>

      {/* CATEGORY BUDGET PROGRESS LIST */}
      <div className="dashboard-section">
        <div className="section-header">
          <div>
            <h2>Category Progress</h2>
            <p>Spending comparison per category</p>
          </div>
        </div>

        {summary?.categories?.length > 0 ? (
          <div className="category-list" style={{ padding: 0 }}>
            {summary.categories.map((item) => {
              const percentage =
                item.budget > 0
                  ? Math.min((item.spent / item.budget) * 100, 100)
                  : 0;

              return (
                <div className="category-item" key={item.category}>
                  <div className="category-info">
                    <strong>{item.category}</strong>
                    <span>
                      {formatCurrency(item.spent)} / {formatCurrency(item.budget)}
                    </span>
                  </div>

                  <div className="category-progress">
                    <div
                      style={{
                        width: `${percentage}%`,
                        backgroundColor:
                          percentage >= 100
                            ? "var(--color-danger)"
                            : percentage >= 80
                            ? "var(--color-warning)"
                            : "var(--color-primary)",
                      }}
                    />
                  </div>

                  <div className="category-meta">
                    <span>Remaining: {formatCurrency(item.remaining)}</span>
                    <strong>{percentage.toFixed(1)}%</strong>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            No category budgets found for {monthName} {selectedYear}.
          </div>
        )}
      </div>

      {/* YOUR BUDGETS CARDS LIST */}
      <div className="dashboard-section">
        <div className="section-header">
          <div>
            <h2>Active Budgets</h2>
            <p>
              {monthlyBudgets.length} budget
              {monthlyBudgets.length !== 1 ? "s" : ""} configured for {monthName} {selectedYear}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Loading budgets...</div>
        ) : monthlyBudgets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">₹</div>
            <h3>No budgets created yet</h3>
            <p>Set a budget for this month to control your spending.</p>
            <button className="primary-button" onClick={openAddBudget}>
              <IconPlus size={16} /> Add Budget
            </button>
          </div>
        ) : (
          <div className="budget-list">
            {monthlyBudgets.map((budget) => {
              const categorySummary = summary?.categories?.find(
                (item) => item.category === budget.category
              );
              const spent =
                budget.category === "Overall"
                  ? overallSpent
                  : categorySummary?.spent || 0;
              const remaining = Number(budget.amount) - Number(spent);
              const percentage =
                Number(budget.amount) > 0
                  ? Math.min((Number(spent) / Number(budget.amount)) * 100, 100)
                  : 0;

              return (
                <div className="budget-card" key={budget._id}>
                  <div className="budget-card-header">
                    <strong>{budget.category} Budget</strong>
                    <span
                      className={`badge ${
                        percentage >= 100
                          ? "badge-severe"
                          : percentage >= 80
                          ? "badge-medium"
                          : "badge-low"
                      }`}
                    >
                      {percentage >= 100
                        ? "Overbudget"
                        : percentage >= 80
                        ? "Near Limit"
                        : "Safe"}
                    </span>
                  </div>

                  <div>
                    <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-text-dark)" }}>
                      {formatCurrency(budget.amount)}
                    </h2>
                    <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                      Spent {formatCurrency(spent)} • Remaining {formatCurrency(remaining)}
                    </span>
                  </div>

                  <div className="progress-track">
                    <div
                      className={`progress-fill ${
                        percentage >= 100 ? "danger" : percentage >= 80 ? "warning" : ""
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <div className="row-actions" style={{ marginTop: "0.25rem" }}>
                    <button onClick={() => openEditBudget(budget)} title="Edit">
                      <IconEdit size={16} /> Edit
                    </button>
                    <button
                      className="danger-text"
                      onClick={() => handleDeleteBudget(budget._id)}
                      title="Delete"
                    >
                      <IconTrash size={16} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BUDGET MODAL */}
      {budgetModal && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeBudgetModal();
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <div>
                <span className="modal-eyebrow">BUDGET</span>
                <h2>{editingBudgetId ? "Edit Budget" : "Add Budget"}</h2>
              </div>
              <button className="close-button" onClick={closeBudgetModal}>
                <IconClose size={20} />
              </button>
            </div>

            <form onSubmit={handleBudgetSubmit}>
              <div className="form-grid">
                <div className="form-group full">
                  <label>Budget Amount</label>
                  <div className="amount-input">
                    <span>₹</span>
                    <input
                      type="number"
                      name="amount"
                      value={budgetForm.amount}
                      onChange={handleBudgetChange}
                      placeholder="0.00"
                      min="0.01"
                      step="0.01"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select
                    name="category"
                    value={budgetForm.category}
                    onChange={handleBudgetChange}
                    required
                  >
                    <option value="">Select category</option>
                    {budgetCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Month</label>
                  <select
                    name="month"
                    value={budgetForm.month}
                    onChange={handleBudgetChange}
                    required
                  >
                    {Array.from({ length: 12 }, (_, index) => (
                      <option key={index + 1} value={index + 1}>
                        {new Date(budgetForm.year, index).toLocaleString("en-IN", {
                          month: "long",
                        })}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group full">
                  <label>Year</label>
                  <input
                    type="number"
                    name="year"
                    value={budgetForm.year}
                    onChange={handleBudgetChange}
                    min="2000"
                    required
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeBudgetModal}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  {editingBudgetId ? "Save Changes" : "Create Budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Budgets;
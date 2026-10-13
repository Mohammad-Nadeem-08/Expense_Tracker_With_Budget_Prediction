import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import {
  IconPlus,
  IconSearch,
  IconEdit,
  IconTrash,
  IconClose,
  IconCheck,
} from "../components/Icons";
import "../App.css";

const EXPENSE_API = "http://localhost:5000/api/expenses";

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

function Expenses() {
  const { token } = useAuth();

  const [expenses, setExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);

  const [expenseModal, setExpenseModal] = useState(false);

  const [expenseForm, setExpenseForm] = useState(initialExpenseForm);

  const [editingExpenseId, setEditingExpenseId] = useState(null);

  const [expenseSearch, setExpenseSearch] = useState("");

  const [message, setMessage] = useState("");

  // MESSAGE TOAST
  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => {
      setMessage("");
    }, 3000);
  };

  // FETCH EXPENSES
  const fetchExpenses = async () => {
    if (!token) return;

    try {
      setLoadingExpenses(true);
      const response = await axios.get(EXPENSE_API, authConfig(token));
      setExpenses(response.data.data || response.data);
    } catch (error) {
      console.error(error);
      showMessage(
        error.response?.data?.message || "Failed to load expenses."
      );
    } finally {
      setLoadingExpenses(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchExpenses();
  }, [token]);

  // FORM HANDLERS
  const handleExpenseChange = (e) => {
    const { name, value } = e.target;
    setExpenseForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const openAddExpense = () => {
    setEditingExpenseId(null);
    setExpenseForm({
      ...initialExpenseForm,
      date: new Date().toISOString().split("T")[0],
    });
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
    setExpenseForm({
      ...initialExpenseForm,
      date: new Date().toISOString().split("T")[0],
    });
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;

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
    } catch (error) {
      console.error(error);
      showMessage(
        error.response?.data?.message || "Failed to save expense."
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
    } catch (error) {
      console.error(error);
      showMessage(
        error.response?.data?.message || "Failed to delete expense."
      );
    }
  };

  // SEARCH FILTER
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
          <p className="eyebrow">TRANSACTIONS</p>
          <h1>Expenses</h1>
          <p className="page-description">
            Manage and track all your recorded expenses.
          </p>
        </div>
        <button className="primary-button" onClick={openAddExpense}>
          <IconPlus size={18} /> Add Expense
        </button>
      </div>

      {/* EXPENSE PANEL */}
      <div className="panel">
        <div className="table-toolbar">
          <div className="search-box">
            <IconSearch size={18} className="text-muted" />
            <input
              type="text"
              placeholder="Search by category, description, method..."
              value={expenseSearch}
              onChange={(e) => setExpenseSearch(e.target.value)}
            />
          </div>
          <span className="result-count">
            {filteredExpenses.length}{" "}
            {filteredExpenses.length === 1 ? "expense" : "expenses"}
          </span>
        </div>

        {loadingExpenses ? (
          <div className="empty-state">Loading expenses...</div>
        ) : filteredExpenses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">₹</div>
            <h3>No expenses found</h3>
            <p>Try adjusting your search criteria or add a new expense.</p>
            {!expenseSearch && (
              <button className="primary-button" onClick={openAddExpense}>
                <IconPlus size={16} /> Add Expense
              </button>
            )}
          </div>
        ) : (
          <div className="expense-table">
            <div className="table-header">
              <span>EXPENSE</span>
              <span>CATEGORY</span>
              <span>DATE</span>
              <span>PAYMENT</span>
              <span style={{ textAlign: "right" }}>AMOUNT</span>
              <span style={{ textAlign: "right" }}>ACTIONS</span>
            </div>

            {filteredExpenses.map((expense) => (
              <div className="table-row" key={expense._id}>
                <div className="table-expense">
                  <div className="transaction-icon">
                    {expense.category?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <strong>
                      {expense.description || expense.category}
                    </strong>
                    {expense.description && <span>{expense.category}</span>}
                  </div>
                </div>

                <div>
                  <span className="table-category">{expense.category}</span>
                </div>

                <span style={{ color: "var(--color-text-medium)", fontSize: "13px" }}>
                  {formatDate(expense.date)}
                </span>

                <span style={{ color: "var(--color-text-muted)", fontSize: "13px" }}>
                  {expense.paymentMethod}
                </span>

                <strong style={{ textAlign: "right", color: "var(--color-text-dark)", fontSize: "15px" }}>
                  {formatCurrency(expense.amount)}
                </strong>

                <div className="row-actions">
                  <button onClick={() => openEditExpense(expense)} title="Edit">
                    <IconEdit size={16} />
                  </button>
                  <button
                    className="danger-text"
                    onClick={() => handleDeleteExpense(expense._id)}
                    title="Delete"
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EXPENSE MODAL */}
      {expenseModal && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeExpenseModal();
          }}
        >
          <div className="modal">
            <div className="modal-header">
              <div>
                <span className="modal-eyebrow">TRANSACTION</span>
                <h2>{editingExpenseId ? "Edit Expense" : "Add Expense"}</h2>
              </div>
              <button className="close-button" onClick={closeExpenseModal}>
                <IconClose size={20} />
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit}>
              <div className="form-grid">
                <div className="form-group full">
                  <label>Amount</label>
                  <div className="amount-input">
                    <span>₹</span>
                    <input
                      type="number"
                      name="amount"
                      value={expenseForm.amount}
                      onChange={handleExpenseChange}
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
                    value={expenseForm.category}
                    onChange={handleExpenseChange}
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Date</label>
                  <input
                    type="date"
                    name="date"
                    value={expenseForm.date}
                    onChange={handleExpenseChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Payment Method</label>
                  <select
                    name="paymentMethod"
                    value={expenseForm.paymentMethod}
                    onChange={handleExpenseChange}
                    required
                  >
                    <option value="">Select method</option>
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group full">
                  <label>Description / Notes (Optional)</label>
                  <input
                    type="text"
                    name="description"
                    value={expenseForm.description}
                    onChange={handleExpenseChange}
                    placeholder="e.g. Grocery store purchase"
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeExpenseModal}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  {editingExpenseId ? "Save Changes" : "Add Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Expenses;
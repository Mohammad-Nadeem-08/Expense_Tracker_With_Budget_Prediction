const Expense = require('../models/Expense');

const expenseFields = ['amount', 'category', 'date', 'paymentMethod', 'description'];

const pickExpenseFields = (body) => expenseFields.reduce((fields, key) => {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
        fields[key] = body[key];
    }
    return fields;
}, {});

// Create an expense
const createExpense = async (req, res) => {
    try {
        // Ownership is derived exclusively from the authenticated JWT.
        const expense = await Expense.create({
            ...pickExpenseFields(req.body),
            user: req.userId,
        });
        res.status(201).json({ success: true, data: expense, message: 'Expense created successfully' });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Failed to create expense', error: error.message });
    }
};

// Get all expenses
const getExpenses = async (req, res) => {
    try {
        const expenses = await Expense.find({ user: req.userId }).sort({ date: -1 });
        // Keeping it compatible by just returning the array, or wrapping it. Let's return the array to avoid breaking the frontend everywhere.
        res.status(200).json(expenses);
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch expenses', error: error.message });
    }
};

// Get one expense
const getExpenseById = async (req, res) => {
    try {
        const expense = await Expense.findOne({ _id: req.params.id, user: req.userId });
        if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
        res.status(200).json({ success: true, data: expense });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Invalid expense ID' });
    }
};

// Update an expense
const updateExpense = async (req, res) => {
    try {
        const expense = await Expense.findOneAndUpdate(
            { _id: req.params.id, user: req.userId },
            pickExpenseFields(req.body),
            { returnDocument: 'after', runValidators: true }
        );
        if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
        res.status(200).json({ success: true, data: expense, message: 'Expense updated successfully' });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Failed to update expense', error: error.message });
    }
};

// Delete an expense
const deleteExpense = async (req, res) => {
    try {
        const expense = await Expense.findOneAndDelete({ _id: req.params.id, user: req.userId });
        if (!expense) return res.status(404).json({ success: false, message: 'Expense not found' });
        res.status(200).json({ success: true, message: 'Expense deleted successfully' });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Invalid expense ID' });
    }
};

module.exports = { createExpense, getExpenses, getExpenseById, updateExpense, deleteExpense };

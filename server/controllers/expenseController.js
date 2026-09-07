const Expense = require('../models/Expense');

// Create an expense
const createExpense = async (req, res) => {
    try {
        const {
            amount,
            category,
            date,
            paymentMethod,
            description,
        } = req.body;

        const expense = await Expense.create({
            user: req.userId,
            amount,
            category,
            date,
            paymentMethod,
            description,
        });

        res.status(201).json(expense);
    } catch (error) {
        res.status(400).json({
            message: 'Failed to create expense',
            error: error.message,
        });
    }
};

// Get all expenses for logged-in user
const getExpenses = async (req, res) => {
    try {
        const expenses = await Expense.find({
            user: req.userId,
        }).sort({ date: -1 });

        res.status(200).json(expenses);
    } catch (error) {
        res.status(500).json({
            message: 'Failed to fetch expenses',
            error: error.message,
        });
    }
};

// Get one expense
const getExpenseById = async (req, res) => {
    try {
        const expense = await Expense.findOne({
            _id: req.params.id,
            user: req.userId,
        });

        if (!expense) {
            return res.status(404).json({
                message: 'Expense not found',
            });
        }

        res.status(200).json(expense);
    } catch (error) {
        res.status(400).json({
            message: 'Invalid expense ID',
        });
    }
};

// Update an expense
const updateExpense = async (req, res) => {
    try {
        const expense = await Expense.findOneAndUpdate(
            {
                _id: req.params.id,
                user: req.userId,
            },
            req.body,
            {
                returnDocument: 'after',
                runValidators: true,
            }
        );

        if (!expense) {
            return res.status(404).json({
                message: 'Expense not found',
            });
        }

        res.status(200).json(expense);
    } catch (error) {
        res.status(400).json({
            message: 'Failed to update expense',
            error: error.message,
        });
    }
};

// Delete an expense
const deleteExpense = async (req, res) => {
    try {
        const expense = await Expense.findOneAndDelete({
            _id: req.params.id,
            user: req.userId,
        });

        if (!expense) {
            return res.status(404).json({
                message: 'Expense not found',
            });
        }

        res.status(200).json({
            message: 'Expense deleted successfully',
        });
    } catch (error) {
        res.status(400).json({
            message: 'Invalid expense ID',
        });
    }
};

module.exports = {
    createExpense,
    getExpenses,
    getExpenseById,
    updateExpense,
    deleteExpense,
};
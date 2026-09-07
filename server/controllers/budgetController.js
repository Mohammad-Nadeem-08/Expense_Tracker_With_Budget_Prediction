const Budget = require("../models/Budget");
const Expense = require("../models/Expense");

const budgetFields = ["amount", "category", "month", "year"];

const pickBudgetFields = (body) => budgetFields.reduce((fields, key) => {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
        fields[key] = body[key];
    }
    return fields;
}, {});

// ===============================
// CREATE BUDGET
// ===============================

const createBudget = async (req, res) => {
    try {
        const budget = await Budget.create({
            ...pickBudgetFields(req.body),
            user: req.userId,
        });

        res.status(201).json(budget);
    } catch (error) {
        res.status(400).json({
            message: "Failed to create budget",
            error: error.message,
        });
    }
};


// ===============================
// GET ALL BUDGETS
// ===============================

const getBudgets = async (req, res) => {
    try {
        const budgets = await Budget.find({
            user: req.userId,
        }).sort({
            year: -1,
            month: -1,
        });

        res.status(200).json(budgets);
    } catch (error) {
        res.status(500).json({
            message: "Failed to fetch budgets",
            error: error.message,
        });
    }
};


// ===============================
// GET BUDGETS BY MONTH
// ===============================

const getBudgetsByMonth = async (req, res) => {
    try {
        const { month, year } = req.params;

        const budgets = await Budget.find({
            user: req.userId,
            month: Number(month),
            year: Number(year),
        });

        res.status(200).json(budgets);
    } catch (error) {
        res.status(400).json({
            message: "Failed to fetch monthly budgets",
            error: error.message,
        });
    }
};


// ===============================
// GET BUDGET SUMMARY
// ===============================

const getBudgetSummary = async (req, res) => {
    try {
        const { month, year } = req.params;

        const selectedMonth = Number(month);
        const selectedYear = Number(year);

        // Get ONLY logged-in user's budgets
        const budgets = await Budget.find({
            user: req.userId,
            month: selectedMonth,
            year: selectedYear,
        });

        // Create date range
        const startDate = new Date(
            selectedYear,
            selectedMonth - 1,
            1
        );

        const endDate = new Date(
            selectedYear,
            selectedMonth,
            1
        );

        // Get ONLY logged-in user's expenses
        const expenses = await Expense.find({
            user: req.userId,
            date: {
                $gte: startDate,
                $lt: endDate,
            },
        });

        // Calculate total spending
        const totalSpent = expenses.reduce(
            (total, expense) =>
                total + expense.amount,
            0
        );

        // Find overall budget
        const overallBudget = budgets.find(
            (budget) =>
                budget.category === "Overall"
        );

        const overallBudgetAmount =
            overallBudget
                ? overallBudget.amount
                : 0;

        // Calculate category spending
        const categorySpending = {};

        expenses.forEach((expense) => {
            if (
                !categorySpending[
                    expense.category
                ]
            ) {
                categorySpending[
                    expense.category
                ] = 0;
            }

            categorySpending[
                expense.category
            ] += expense.amount;
        });

        // Create category summary
        const categories = budgets
            .filter(
                (budget) =>
                    budget.category !== "Overall"
            )
            .map((budget) => {
                const spent =
                    categorySpending[
                        budget.category
                    ] || 0;

                return {
                    category:
                        budget.category,

                    budget:
                        budget.amount,

                    spent,

                    remaining:
                        budget.amount - spent,
                };
            });

        res.status(200).json({
            month: selectedMonth,
            year: selectedYear,

            overall: {
                budget:
                    overallBudgetAmount,

                spent:
                    totalSpent,

                remaining:
                    overallBudgetAmount -
                    totalSpent,
            },

            categories,
        });

    } catch (error) {
        res.status(500).json({
            message:
                "Failed to generate budget summary",

            error: error.message,
        });
    }
};


// ===============================
// UPDATE BUDGET
// ===============================

const updateBudget = async (req, res) => {
    try {
        const budget =
            await Budget.findOneAndUpdate(
                {
                    _id: req.params.id,

                    // IMPORTANT
                    // Only owner can update
                    user: req.userId,
                },

                pickBudgetFields(req.body),

                {
                    returnDocument: "after",
                    runValidators: true,
                }
            );

        if (!budget) {
            return res.status(404).json({
                message:
                    "Budget not found",
            });
        }

        res.status(200).json(budget);

    } catch (error) {
        res.status(400).json({
            message:
                "Failed to update budget",

            error: error.message,
        });
    }
};


// ===============================
// DELETE BUDGET
// ===============================

const deleteBudget = async (req, res) => {
    try {
        const budget =
            await Budget.findOneAndDelete({
                _id: req.params.id,

                // IMPORTANT
                // Only owner can delete
                user: req.userId,
            });

        if (!budget) {
            return res.status(404).json({
                message:
                    "Budget not found",
            });
        }

        res.status(200).json({
            message:
                "Budget deleted successfully",
        });

    } catch (error) {
        res.status(400).json({
            message:
                "Invalid budget ID",
        });
    }
};


module.exports = {
    createBudget,
    getBudgets,
    getBudgetsByMonth,
    getBudgetSummary,
    updateBudget,
    deleteBudget,
};

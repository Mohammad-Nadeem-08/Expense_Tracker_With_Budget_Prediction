const Expense = require("../models/Expense");
const Budget = require("../models/Budget");

// dotenv is loaded before this module by server.js. The fallback keeps local
// development convenient while allowing server/.env to configure deployments.
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:8000";

const monthKeyForDate = (date) => {
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) return null;
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
};

const nextMonthKey = (month) => {
    const [year, monthNumber] = month.split("-").map(Number);
    const date = new Date(Date.UTC(year, monthNumber, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};

const monthLabel = (month) => {
    const [year, monthNumber] = month.split("-").map(Number);
    return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "UTC" })
        .format(new Date(Date.UTC(year, monthNumber - 1, 1)));
};

const monthParts = (month) => {
    const [year, monthNumber] = month.split("-").map(Number);
    return { year, month: monthNumber };
};

const getPrediction = async (req, res) => {
    try {
        const [expenses, budgets] = await Promise.all([
            Expense.find({ user: req.userId }).sort({ date: 1 }),
            // Deterministic handling until compound budget uniqueness is added.
            Budget.find({ user: req.userId }).sort({ createdAt: -1 }),
        ]);

        if (expenses.length === 0) {
            return res.status(200).json({
                success: true, status: "no_data", data: null, historyMonths: 0,
                monthlySpending: [], forecastTarget: null, forecastBudget: null,
                rankingPeriod: null, message: "Add expenses to generate a prediction.",
            });
        }

        // First collect observed months, then fill every real calendar month
        // between the first and last expense. A gap is therefore a zero month.
        const monthlyMap = new Map();
        for (const expense of expenses) {
            const key = monthKeyForDate(expense.date);
            if (!key) continue;
            if (!monthlyMap.has(key)) {
                monthlyMap.set(key, { amount: 0, transaction_count: 0, categories: new Set() });
            }
            const month = monthlyMap.get(key);
            month.amount += Number(expense.amount || 0);
            month.transaction_count += 1;
            month.categories.add(expense.category);
        }

        const observedMonths = [...monthlyMap.keys()].sort();
        if (observedMonths.length === 0) {
            return res.status(200).json({
                success: true, status: "no_data", data: null, historyMonths: 0,
                monthlySpending: [], forecastTarget: null, forecastBudget: null,
                rankingPeriod: null, message: "Add valid dated expenses to generate a prediction.",
            });
        }

        const firstMonth = observedMonths[0];
        const lastMonth = observedMonths[observedMonths.length - 1];
        const monthlyFeatures = [];
        for (let key = firstMonth; key <= lastMonth; key = nextMonthKey(key)) {
            const data = monthlyMap.get(key) || { amount: 0, transaction_count: 0, categories: new Set() };
            const { year, month } = monthParts(key);
            const overallBudget = budgets.find((budget) => (
                budget.category === "Overall" && budget.year === year && budget.month === month
            ));
            monthlyFeatures.push({
                month: key,
                amount: Number(data.amount.toFixed(2)),
                transaction_count: data.transaction_count,
                category_count: data.categories.size,
                overall_budget: overallBudget ? Number(overallBudget.amount) : 0,
            });
        }

        const forecastMonth = nextMonthKey(lastMonth);
        const forecastParts = monthParts(forecastMonth);
        const overallForecastBudget = budgets.find((budget) => (
            budget.category === "Overall"
            && budget.year === forecastParts.year
            && budget.month === forecastParts.month
        ));
        const forecastTarget = { month: forecastMonth, label: monthLabel(forecastMonth) };
        const forecastBudget = overallForecastBudget ? {
            amount: Number(overallForecastBudget.amount),
            month: forecastMonth,
            label: monthLabel(forecastMonth),
        } : null;

        // Rank the current active month; otherwise rank the latest completed
        // month with expenses. Never combine all history into one period.
        const currentMonth = monthKeyForDate(new Date());
        let rankingMonth = monthlyMap.has(currentMonth) ? currentMonth : null;
        if (!rankingMonth) {
            rankingMonth = [...observedMonths].filter((month) => month < currentMonth).pop()
                || observedMonths[observedMonths.length - 1];
        }
        const rankingParts = monthParts(rankingMonth);
        const rankingExpenses = expenses.filter((expense) => monthKeyForDate(expense.date) === rankingMonth);
        const categoryStats = new Map();
        for (const expense of rankingExpenses) {
            if (!categoryStats.has(expense.category)) {
                categoryStats.set(expense.category, { spent: 0, transaction_count: 0 });
            }
            const stats = categoryStats.get(expense.category);
            stats.spent += Number(expense.amount || 0);
            stats.transaction_count += 1;
        }
        const categories = [...categoryStats.entries()].map(([category, stats]) => {
            const budget = budgets.find((item) => (
                item.category === category
                && item.year === rankingParts.year
                && item.month === rankingParts.month
            ));
            return {
                category,
                spent: Number(stats.spent.toFixed(2)),
                budget: budget ? Number(budget.amount) : 0,
                transaction_count: stats.transaction_count,
            };
        });
        const rankingPeriod = { month: rankingMonth, label: monthLabel(rankingMonth) };

        const mlResponse = await fetch(`${ML_SERVICE_URL}/predict/unified`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                monthly_features: monthlyFeatures,
                categories,
                overall_budget: forecastBudget ? forecastBudget.amount : 0,
                total_transaction_count: rankingExpenses.length,
            }),
        });
        if (!mlResponse.ok) throw new Error(`ML service returned ${mlResponse.status}`);

        const mlResult = await mlResponse.json();
        const hasForecast = Boolean(
            mlResult.linear_regression?.success
            && mlResult.random_forest?.success
            && typeof mlResult.ensemble_prediction === "number"
        );

        return res.status(200).json({
            success: mlResult.success,
            status: hasForecast ? "success" : "insufficient_data",
            data: mlResult,
            historyMonths: monthlyFeatures.length,
            monthlySpending: monthlyFeatures,
            forecastTarget,
            forecastBudget,
            rankingPeriod,
            message: hasForecast ? "Prediction generated successfully." : "More monthly history is required for a prediction.",
        });
    } catch (error) {
        console.error("Prediction error:", error);
        return res.status(500).json({ success: false, message: "Failed to generate ML prediction." });
    }
};

module.exports = { getPrediction, _private: { monthKeyForDate, nextMonthKey, monthLabel } };

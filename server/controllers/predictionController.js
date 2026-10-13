const Expense = require("../models/Expense");
const Budget = require("../models/Budget");

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
    return new Intl.DateTimeFormat("en-IN", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
    }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
};

const monthParts = (month) => {
    const [year, monthNumber] = month.split("-").map(Number);
    return { year, month: monthNumber };
};

const roundMoney = (value) => Number(Math.max(0, value).toFixed(2));

// Average of up to the last three observed calendar months.
const movingAverage = (values) => {
    const recent = values.slice(-3);
    return recent.reduce((sum, value) => sum + value, 0) / recent.length;
};

// Most recent month receives the largest weight. Normalize weights when
// fewer than three months of history are available.
const weightedMovingAverage = (values) => {
    const recent = values.slice(-3);
    const baseWeights = [0.2, 0.3, 0.5].slice(-recent.length);
    const weightTotal = baseWeights.reduce((sum, weight) => sum + weight, 0);
    return recent.reduce((sum, value, index) => sum + value * baseWeights[index], 0) / weightTotal;
};

// Simple exponential smoothing; alpha=0.5, initialized with the first value.
const simpleExponentialSmoothing = (values, alpha = 0.5) => {
    let level = values[0];
    for (let index = 1; index < values.length; index += 1) {
        level = alpha * values[index] + (1 - alpha) * level;
    }
    return level;
};

const getPrediction = async (req, res) => {
    try {
        const [expenses, budgets] = await Promise.all([
            Expense.find({ user: req.userId }).sort({ date: 1 }),
            Budget.find({ user: req.userId }).sort({ createdAt: -1 }),
        ]);

        if (expenses.length === 0) {
            return res.status(200).json({
                success: true,
                status: "no_data",
                data: null,
                historyMonths: 0,
                monthlySpending: [],
                forecastTarget: null,
                forecastBudget: null,
                message: "Add expenses to generate a prediction.",
            });
        }

        // Sum expenses by calendar month, filling months without transactions as zero.
        const monthlyMap = new Map();
        for (const expense of expenses) {
            const key = monthKeyForDate(expense.date);
            if (!key) continue;
            monthlyMap.set(key, (monthlyMap.get(key) || 0) + Number(expense.amount || 0));
        }

        const observedMonths = [...monthlyMap.keys()].sort();
        if (observedMonths.length === 0) {
            return res.status(200).json({
                success: true,
                status: "no_data",
                data: null,
                historyMonths: 0,
                monthlySpending: [],
                forecastTarget: null,
                forecastBudget: null,
                message: "Add valid dated expenses to generate a prediction.",
            });
        }

        const firstMonth = observedMonths[0];
        const lastMonth = observedMonths[observedMonths.length - 1];
        const monthlySpending = [];
        for (let key = firstMonth; key <= lastMonth; key = nextMonthKey(key)) {
            const amount = Number((monthlyMap.get(key) || 0).toFixed(2));
            monthlySpending.push({ month: key, label: monthLabel(key), amount });
        }

        const values = monthlySpending.map((month) => month.amount);
        const forecastMonth = nextMonthKey(lastMonth);
        const forecastParts = monthParts(forecastMonth);
        const overallForecastBudget = budgets.find((budget) => (
            budget.category === "Overall"
            && budget.year === forecastParts.year
            && budget.month === forecastParts.month
        ));
        const forecastBudget = overallForecastBudget ? {
            amount: Number(overallForecastBudget.amount),
            month: forecastMonth,
            label: monthLabel(forecastMonth),
        } : null;

        const predictions = {
            movingAverage: roundMoney(movingAverage(values)),
            weightedMovingAverage: roundMoney(weightedMovingAverage(values)),
            exponentialSmoothing: roundMoney(simpleExponentialSmoothing(values, 0.5)),
        };
        const finalPrediction = roundMoney(
            (predictions.movingAverage
                + predictions.weightedMovingAverage
                + predictions.exponentialSmoothing) / 3,
        );

        return res.status(200).json({
            success: true,
            status: "success",
            data: {
                predictions,
                finalPrediction,
                // Compatibility alias used by the dashboard widget.
                ensemble_prediction: finalPrediction,
                exponentialSmoothingAlpha: 0.5,
                combinationMethod: "Arithmetic mean of the three predictions",
            },
            historyMonths: monthlySpending.length,
            monthlySpending,
            forecastTarget: { month: forecastMonth, label: monthLabel(forecastMonth) },
            forecastBudget,
            message: "Three statistical forecasts generated successfully.",
        });
    } catch (error) {
        console.error("Prediction error:", error);
        return res.status(500).json({ success: false, message: "Failed to generate expense prediction." });
    }
};

module.exports = {
    getPrediction,
    _private: {
        monthKeyForDate,
        nextMonthKey,
        monthLabel,
        movingAverage,
        weightedMovingAverage,
        simpleExponentialSmoothing,
    },
};

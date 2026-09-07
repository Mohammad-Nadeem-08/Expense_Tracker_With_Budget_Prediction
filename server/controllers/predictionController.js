const Expense = require("../models/Expense");

const ML_SERVICE_URL =
    process.env.ML_SERVICE_URL ||
    "http://127.0.0.1:8000";


// ======================================
// GET ML SPENDING PREDICTION
// ======================================

const getPrediction = async (req, res) => {
    try {
        // Get only the logged-in user's expenses
        const expenses = await Expense.find({
            user: req.userId,
        }).sort({
            date: 1,
        });

        if (expenses.length === 0) {
            return res.status(200).json({
                success: true,
                prediction: null,
                model: "Linear Regression",
                message:
                    "Add expenses to generate a prediction.",
                monthlySpending: [],
            });
        }

        // ======================================
        // GROUP EXPENSES BY MONTH
        // ======================================

        const monthlyMap = {};

        expenses.forEach((expense) => {
            const date = new Date(expense.date);

            if (Number.isNaN(date.getTime())) {
                return;
            }

            const year = date.getUTCFullYear();
            const month = String(
                date.getUTCMonth() + 1
            ).padStart(2, "0");

            const key = `${year}-${month}`;

            if (!monthlyMap[key]) {
                monthlyMap[key] = 0;
            }

            monthlyMap[key] += Number(
                expense.amount || 0
            );
        });

        // Convert object into array
        const monthlySpending = Object.entries(
            monthlyMap
        )
            .map(([month, amount]) => ({
                month,
                amount: Number(amount.toFixed(2)),
            }))
            .sort((a, b) =>
                a.month.localeCompare(b.month)
            );

        // ======================================
        // REQUIRE MINIMUM DATA
        // ======================================

        if (monthlySpending.length < 3) {
            return res.status(200).json({
                success: false,
                prediction: null,
                model: "Linear Regression",
                message:
                    "At least 3 months of spending history is required for ML prediction.",
                trainingMonths:
                    monthlySpending.length,
                monthlySpending,
            });
        }

        // ======================================
        // SEND DATA TO PYTHON ML SERVICE
        // ======================================

        const mlResponse = await fetch(
            `${ML_SERVICE_URL}/predict`,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",
                },

                body: JSON.stringify({
                    monthly_spending:
                        monthlySpending,
                }),
            }
        );

        if (!mlResponse.ok) {
            throw new Error(
                `ML service returned ${mlResponse.status}`
            );
        }

        const mlResult =
            await mlResponse.json();

        // ======================================
        // RETURN ML RESULT
        // ======================================

        res.status(200).json({
            success:
                mlResult.success,

            prediction:
                mlResult.prediction,

            model:
                mlResult.model,

            trainingMonths:
                mlResult.training_months,

            r2Score:
                mlResult.r2_score,

            monthlySpending,

            message:
                mlResult.message ||
                "Prediction generated successfully.",
        });

    } catch (error) {
        console.error(
            "Prediction error:",
            error
        );

        res.status(500).json({
            success: false,
            message:
                "Failed to generate ML prediction.",
            error: error.message,
        });
    }
};


module.exports = {
    getPrediction,
};
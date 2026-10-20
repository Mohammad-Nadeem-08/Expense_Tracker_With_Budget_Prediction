const test = require("node:test");
const assert = require("node:assert/strict");

const Expense = require("../models/Expense");
const Budget = require("../models/Budget");
const expenseController = require("../controllers/expenseController");
const budgetController = require("../controllers/budgetController");
const { buildDemoData } = require("../services/demoData");
const {
    forecastNextMonth,
    walkForwardBacktest,
    scoreForecasts,
} = require("../services/forecasting");

const response = () => ({
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
});

test("expense ownership and fields always come from the authenticated user", { concurrency: false }, async () => {
    const originalCreate = Expense.create;
    const originalUpdate = Expense.findOneAndUpdate;
    const originalFind = Expense.findOne;
    const originalDelete = Expense.findOneAndDelete;
    let created;
    let updated;
    let readFilter;
    let deleteFilter;
    Expense.create = async (value) => { created = value; return value; };
    Expense.findOneAndUpdate = async (filter, value) => { updated = { filter, value }; return value; };
    Expense.findOne = async (filter) => { readFilter = filter; return null; };
    Expense.findOneAndDelete = async (filter) => { deleteFilter = filter; return null; };

    const req = { userId: "user-a", body: { user: "user-b", userId: "user-b", amount: 100, category: "Food", date: "2026-01-01", paymentMethod: "Cash", injected: true } };
    await expenseController.createExpense(req, response());
    assert.equal(created.user, "user-a");
    assert.equal(created.injected, undefined);
    assert.equal(created.userId, undefined);

    await expenseController.updateExpense({ ...req, params: { id: "expense-id" } }, response());
    assert.deepEqual(updated.filter, { _id: "expense-id", user: "user-a" });
    assert.equal(updated.value.user, undefined);
    assert.equal(updated.value.userId, undefined);

    await expenseController.getExpenseById({ userId: "user-a", params: { id: "other-user-expense" } }, response());
    assert.deepEqual(readFilter, { _id: "other-user-expense", user: "user-a" });
    await expenseController.deleteExpense({ userId: "user-a", params: { id: "other-user-expense" } }, response());
    assert.deepEqual(deleteFilter, { _id: "other-user-expense", user: "user-a" });

    Expense.create = originalCreate;
    Expense.findOneAndUpdate = originalUpdate;
    Expense.findOne = originalFind;
    Expense.findOneAndDelete = originalDelete;
});

test("budget ownership and fields always come from the authenticated user", { concurrency: false }, async () => {
    const originalCreate = Budget.create;
    const originalUpdate = Budget.findOneAndUpdate;
    const originalDelete = Budget.findOneAndDelete;
    let created;
    let updated;
    let deleteFilter;
    Budget.create = async (value) => { created = value; return value; };
    Budget.findOneAndUpdate = async (filter, value) => { updated = { filter, value }; return value; };
    Budget.findOneAndDelete = async (filter) => { deleteFilter = filter; return null; };

    const req = { userId: "user-a", body: { user: "user-b", userId: "user-b", amount: 1000, category: "Overall", month: 4, year: 2026, injected: true } };
    await budgetController.createBudget(req, response());
    assert.equal(created.user, "user-a");
    assert.equal(created.injected, undefined);
    assert.equal(created.userId, undefined);

    await budgetController.updateBudget({ ...req, params: { id: "other-user-budget" } }, response());
    assert.deepEqual(updated.filter, { _id: "other-user-budget", user: "user-a" });
    assert.equal(updated.value.user, undefined);
    assert.equal(updated.value.userId, undefined);
    await budgetController.deleteBudget({ userId: "user-a", params: { id: "other-user-budget" } }, response());
    assert.deepEqual(deleteFilter, { _id: "other-user-budget", user: "user-a" });

    Budget.create = originalCreate;
    Budget.findOneAndUpdate = originalUpdate;
    Budget.findOneAndDelete = originalDelete;
});

test("statistical prediction uses calendar-month totals and combines three methods", { concurrency: false }, async () => {
    const originalExpenseFind = Expense.find;
    const originalBudgetFind = Budget.find;
    const predictionController = require("../controllers/predictionController");

    Expense.find = () => ({ sort: async () => [
        { amount: 18000, category: "Food", date: new Date("2026-01-10T12:00:00Z") },
        { amount: 20500, category: "Travel", date: new Date("2026-02-10T12:00:00Z") },
        { amount: 19700, category: "Food", date: new Date("2026-03-10T12:00:00Z") },
    ] });
    Budget.find = () => ({ sort: async () => [
        { category: "Overall", amount: 22000, month: 4, year: 2026 },
    ] });

    const res = response();
    await predictionController.getPrediction({ userId: "user-a" }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.status, "success");
    assert.deepEqual(res.body.monthlySpending.map((item) => item.month), ["2026-01", "2026-02", "2026-03"]);
    assert.equal(res.body.forecastTarget.month, "2026-04");
    assert.equal(res.body.forecastBudget.amount, 22000);
    assert.equal(res.body.data.predictions.movingAverage, 19400);
    assert.equal(res.body.data.predictions.weightedMovingAverage, 19600);
    assert.equal(res.body.data.predictions.exponentialSmoothing, 19475);
    assert.equal(res.body.data.finalPrediction, 19491.67);
    assert.equal(res.body.data.ensemble_prediction, 19491.67);

    Expense.find = () => ({ sort: async () => [] });
    const emptyRes = response();
    await predictionController.getPrediction({ userId: "new-user" }, emptyRes);
    assert.equal(emptyRes.body.status, "no_data");
    assert.equal(emptyRes.body.data, null);

    Expense.find = originalExpenseFind;
    Budget.find = originalBudgetFind;
});

test("expense list and mutations handle missing records and database failures", { concurrency: false }, async () => {
    const originals = {
        find: Expense.find,
        create: Expense.create,
        findOne: Expense.findOne,
        findOneAndUpdate: Expense.findOneAndUpdate,
        findOneAndDelete: Expense.findOneAndDelete,
    };
    const expense = { _id: "expense-a", amount: 45 };

    try {
        Expense.find = () => ({ sort: async () => [expense] });
        const list = response();
        await expenseController.getExpenses({ userId: "user-a" }, list);
        assert.deepEqual(list.body, [expense]);

        Expense.find = () => ({ sort: async () => { throw new Error("database down"); } });
        const listError = response();
        await expenseController.getExpenses({ userId: "user-a" }, listError);
        assert.equal(listError.statusCode, 500);

        Expense.findOne = async () => expense;
        const found = response();
        await expenseController.getExpenseById({ userId: "user-a", params: { id: "expense-a" } }, found);
        assert.equal(found.body.data, expense);

        Expense.findOne = async () => { throw new Error("invalid id"); };
        const invalidId = response();
        await expenseController.getExpenseById({ userId: "user-a", params: { id: "!" } }, invalidId);
        assert.equal(invalidId.statusCode, 400);

        Expense.findOneAndUpdate = async () => null;
        const updateMissing = response();
        await expenseController.updateExpense({ userId: "user-a", params: { id: "missing" }, body: {} }, updateMissing);
        assert.equal(updateMissing.statusCode, 404);

        Expense.findOneAndUpdate = async () => { throw new Error("invalid update"); };
        const updateError = response();
        await expenseController.updateExpense({ userId: "user-a", params: { id: "!" }, body: {} }, updateError);
        assert.equal(updateError.statusCode, 400);

        Expense.findOneAndDelete = async () => expense;
        const deleted = response();
        await expenseController.deleteExpense({ userId: "user-a", params: { id: "expense-a" } }, deleted);
        assert.equal(deleted.statusCode, 200);

        Expense.findOneAndDelete = async () => null;
        const deleteMissing = response();
        await expenseController.deleteExpense({ userId: "user-a", params: { id: "missing" } }, deleteMissing);
        assert.equal(deleteMissing.statusCode, 404);

        Expense.findOneAndDelete = async () => { throw new Error("invalid id"); };
        const deleteError = response();
        await expenseController.deleteExpense({ userId: "user-a", params: { id: "!" } }, deleteError);
        assert.equal(deleteError.statusCode, 400);

        Expense.create = async () => { throw new Error("invalid expense"); };
        const createError = response();
        await expenseController.createExpense({ userId: "user-a", body: {} }, createError);
        assert.equal(createError.statusCode, 400);
    } finally {
        Object.assign(Expense, originals);
    }
});

test("budget reads and updates handle summaries, missing records, and database failures", { concurrency: false }, async () => {
    const originals = {
        find: Budget.find,
        create: Budget.create,
        findOneAndUpdate: Budget.findOneAndUpdate,
        findOneAndDelete: Budget.findOneAndDelete,
    };
    const originalExpenseFind = Expense.find;
    const budgets = [
        { category: "Overall", amount: 1000 },
        { category: "Food", amount: 300 },
    ];

    try {
        Budget.find = () => ({ sort: async () => budgets });
        const list = response();
        await budgetController.getBudgets({ userId: "user-a" }, list);
        assert.equal(list.body, budgets);

        Budget.find = () => ({ sort: async () => { throw new Error("database down"); } });
        const listError = response();
        await budgetController.getBudgets({ userId: "user-a" }, listError);
        assert.equal(listError.statusCode, 500);

        Budget.find = async () => budgets;
        const byMonth = response();
        await budgetController.getBudgetsByMonth({ userId: "user-a", params: { month: "6", year: "2026" } }, byMonth);
        assert.equal(byMonth.body, budgets);

        Budget.find = async () => { throw new Error("database down"); };
        const byMonthError = response();
        await budgetController.getBudgetsByMonth({ userId: "user-a", params: { month: "6", year: "2026" } }, byMonthError);
        assert.equal(byMonthError.statusCode, 400);

        Budget.find = async () => budgets;
        Expense.find = async () => [
            { category: "Food", amount: 120 },
            { category: "Bills", amount: 80 },
        ];
        const summary = response();
        await budgetController.getBudgetSummary({ userId: "user-a", params: { month: "6", year: "2026" } }, summary);
        assert.equal(summary.body.overall.budget, 1000);
        assert.equal(summary.body.overall.spent, 200);
        assert.deepEqual(summary.body.categories, [{ category: "Food", budget: 300, spent: 120, remaining: 180 }]);

        Budget.find = async () => [];
        Expense.find = async () => [];
        const emptySummary = response();
        await budgetController.getBudgetSummary({ userId: "user-a", params: { month: "6", year: "2026" } }, emptySummary);
        assert.equal(emptySummary.body.overall.remaining, 0);

        Budget.find = async () => { throw new Error("database down"); };
        const summaryError = response();
        await budgetController.getBudgetSummary({ userId: "user-a", params: { month: "6", year: "2026" } }, summaryError);
        assert.equal(summaryError.statusCode, 500);

        Budget.findOneAndUpdate = async () => null;
        const updateMissing = response();
        await budgetController.updateBudget({ userId: "user-a", params: { id: "missing" }, body: {} }, updateMissing);
        assert.equal(updateMissing.statusCode, 404);

        Budget.findOneAndUpdate = async () => { throw new Error("invalid update"); };
        const updateError = response();
        await budgetController.updateBudget({ userId: "user-a", params: { id: "!" }, body: {} }, updateError);
        assert.equal(updateError.statusCode, 400);

        Budget.findOneAndDelete = async () => null;
        const deleteMissing = response();
        await budgetController.deleteBudget({ userId: "user-a", params: { id: "missing" } }, deleteMissing);
        assert.equal(deleteMissing.statusCode, 404);

        Budget.findOneAndDelete = async () => ({ _id: "budget-a" });
        const deleted = response();
        await budgetController.deleteBudget({ userId: "user-a", params: { id: "budget-a" } }, deleted);
        assert.equal(deleted.statusCode, 200);

        Budget.findOneAndDelete = async () => { throw new Error("invalid id"); };
        const deleteError = response();
        await budgetController.deleteBudget({ userId: "user-a", params: { id: "!" } }, deleteError);
        assert.equal(deleteError.statusCode, 400);

        Budget.create = async () => { throw new Error("invalid budget"); };
        const createError = response();
        await budgetController.createBudget({ userId: "user-a", body: {} }, createError);
        assert.equal(createError.statusCode, 400);
    } finally {
        Object.assign(Budget, originals);
        Expense.find = originalExpenseFind;
    }
});

test("forecast returns no-data, skips invalid dates, and reports query failures", { concurrency: false }, async () => {
    const originalExpenseFind = Expense.find;
    const originalBudgetFind = Budget.find;
    const originalConsoleError = console.error;
    try {
        Expense.find = () => ({ sort: async () => [{ amount: 100, date: "invalid" }] });
        Budget.find = () => ({ sort: async () => [] });
        const invalidData = response();
        await require("../controllers/predictionController").getPrediction({ userId: "user-a" }, invalidData);
        assert.equal(invalidData.body.status, "no_data");

        Expense.find = () => ({ sort: async () => [
            { amount: 100, date: new Date("2026-01-10T12:00:00Z") },
        ] });
        const noBudget = response();
        await require("../controllers/predictionController").getPrediction({ userId: "user-a" }, noBudget);
        assert.equal(noBudget.statusCode, 200);
        assert.equal(noBudget.body.forecastBudget, null);

        console.error = () => {};
        Expense.find = () => ({ sort: async () => { throw new Error("database down"); } });
        const failedQuery = response();
        await require("../controllers/predictionController").getPrediction({ userId: "user-a" }, failedQuery);
        assert.equal(failedQuery.statusCode, 500);
    } finally {
        Expense.find = originalExpenseFind;
        Budget.find = originalBudgetFind;
        console.error = originalConsoleError;
    }
});

test("forecast engine validates values and reports expanding-window accuracy metrics", () => {
    const forecast = forecastNextMonth([10_000, 11_000, 12_000]);
    assert.deepEqual(forecast.predictions, {
        movingAverage: 11_000,
        weightedMovingAverage: 11_300,
        exponentialSmoothing: 11_250,
    });
    assert.equal(forecast.finalPrediction, 11_183.33);
    assert.throws(() => forecastNextMonth([]), /At least one monthly value/);
    assert.throws(() => forecastNextMonth([10, -1]), /finite, non-negative/);
    assert.throws(() => scoreForecasts([1], []), /equal-length arrays/);
    assert.equal(scoreForecasts([0], [0]).mape, null);
    assert.throws(() => walkForwardBacktest([1, 2], { maxFolds: 0 }), /positive integers/);

    assert.deepEqual(scoreForecasts([100, 0, 200], [110, 50, 180]), {
        observations: 3,
        mae: 26.67,
        rmse: 31.62,
        mape: 10,
        bias: 13.33,
    });

    const shortHistory = walkForwardBacktest([100, 110], { minTrainingMonths: 2 });
    assert.equal(shortHistory.status, "insufficient_history");
    const backtest = walkForwardBacktest(Array.from({ length: 24 }, (_, index) => 10_000 + index * 100));
    assert.equal(backtest.status, "complete");
    assert.equal(backtest.folds, 12);
    assert.ok(Number.isFinite(backtest.models.ensemble.rmse));
});

test("demo dataset contains 24 full months of positive, balanced transactions", () => {
    const demo = buildDemoData(new Date("2026-10-19T12:00:00.000Z"));
    assert.equal(demo.startMonth, "2024-10");
    assert.equal(demo.endMonth, "2026-09");
    assert.equal(demo.targetMonth, "2026-10");
    assert.equal(demo.monthlyTotals.length, 24);
    assert.equal(demo.expenses.length, 144);
    assert.equal(demo.budgets.length, 7);

    demo.monthlyTotals.forEach((month) => {
        const monthExpenses = demo.expenses.filter((expense) => expense.date.startsWith(month.month));
        const actualTotal = monthExpenses.reduce((total, expense) => total + expense.amount, 0);
        assert.equal(Number(actualTotal.toFixed(2)), month.amount);
        assert.ok(monthExpenses.every((expense) => expense.amount > 0));
    });
});

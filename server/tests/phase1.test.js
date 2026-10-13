const test = require("node:test");
const assert = require("node:assert/strict");

const Expense = require("../models/Expense");
const Budget = require("../models/Budget");
const expenseController = require("../controllers/expenseController");
const budgetController = require("../controllers/budgetController");

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

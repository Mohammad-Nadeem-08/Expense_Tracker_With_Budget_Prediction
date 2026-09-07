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

test("prediction uses calendar months, configured service URL, forecast budget, and latest completed ranking period", { concurrency: false }, async () => {
    const originalExpenseFind = Expense.find;
    const originalBudgetFind = Budget.find;
    const originalFetch = global.fetch;
    const originalUrl = process.env.ML_SERVICE_URL;
    process.env.ML_SERVICE_URL = "http://configured-ml.example:8000";
    delete require.cache[require.resolve("../controllers/predictionController")];
    const predictionController = require("../controllers/predictionController");
    let requestUrl;
    let requestBody;
    Expense.find = () => ({ sort: async () => [
        { amount: 10000, category: "Food", date: new Date("2026-01-10T12:00:00Z") },
        { amount: 12000, category: "Travel", date: new Date("2026-03-10T12:00:00Z") },
    ] });
    Budget.find = () => ({ sort: async () => [
        { category: "Overall", amount: 20000, month: 4, year: 2026 },
        { category: "Food", amount: 15000, month: 1, year: 2026 },
    ] });
    global.fetch = async (url, options) => {
        requestUrl = url;
        requestBody = JSON.parse(options.body);
        return { ok: true, json: async () => ({
            success: true,
            linear_regression: { success: true, prediction: 13000 },
            random_forest: { success: true, prediction: 12500 },
            ensemble_prediction: 12750,
            risk_ranking: [],
        }) };
    };
    const res = response();
    await predictionController.getPrediction({ userId: "user-a" }, res);

    assert.equal(requestUrl, "http://configured-ml.example:8000/predict/unified");
    assert.deepEqual(requestBody.monthly_features.map((item) => item.month), ["2026-01", "2026-02", "2026-03"]);
    assert.deepEqual(requestBody.monthly_features[1], { month: "2026-02", amount: 0, transaction_count: 0, category_count: 0, overall_budget: 0 });
    assert.equal(res.body.forecastTarget.month, "2026-04");
    assert.equal(res.body.forecastBudget.amount, 20000);
    assert.equal(res.body.rankingPeriod.month, "2026-03");

    // When the current month has activity, it becomes the ranking period.
    const now = new Date();
    const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    Expense.find = () => ({ sort: async () => [{ amount: 500, category: "Food", date: now }] });
    const currentRes = response();
    await predictionController.getPrediction({ userId: "user-a" }, currentRes);
    assert.equal(currentRes.body.rankingPeriod.month, currentMonth);

    // A user with no expenses receives an explicit onboarding state.
    Expense.find = () => ({ sort: async () => [] });
    const emptyRes = response();
    await predictionController.getPrediction({ userId: "new-user" }, emptyRes);
    assert.equal(emptyRes.body.status, "no_data");
    assert.equal(emptyRes.body.data, null);

    // One calendar month produces an explicit insufficient-data state.
    Expense.find = () => ({ sort: async () => [{ amount: 500, category: "Food", date: new Date("2026-01-01T12:00:00Z") }] });
    global.fetch = async () => ({ ok: true, json: async () => ({
        success: true,
        linear_regression: { success: false, prediction: null },
        random_forest: { success: false, prediction: null },
        ensemble_prediction: null,
        risk_ranking: [],
    }) });
    const insufficientRes = response();
    await predictionController.getPrediction({ userId: "user-a" }, insufficientRes);
    assert.equal(insufficientRes.body.status, "insufficient_data");
    assert.equal(insufficientRes.body.historyMonths, 1);

    Expense.find = originalExpenseFind;
    Budget.find = originalBudgetFind;
    global.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.ML_SERVICE_URL;
    else process.env.ML_SERVICE_URL = originalUrl;
});

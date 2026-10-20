require("dotenv").config();

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");
const Expense = require("../models/Expense");
const Budget = require("../models/Budget");
const { buildDemoData } = require("../services/demoData");
const { forecastNextMonth } = require("../services/forecasting");

const DEMO_EMAIL = (process.env.DEMO_EMAIL || "demo@smartspend.local").trim().toLowerCase();

const seedDemoData = async () => {
    if (process.env.NODE_ENV === "production") {
        throw new Error("The demo seeder is disabled when NODE_ENV=production.");
    }
    if (!process.env.MONGODB_URI) {
        throw new Error("Set MONGODB_URI in server/.env before seeding the demo account.");
    }
    if (!process.env.JWT_SECRET) {
        throw new Error("Set JWT_SECRET in server/.env before using the demo account to log in.");
    }

    const password = process.env.DEMO_PASSWORD || crypto.randomBytes(18).toString("base64url");
    if (password.length < 12) {
        throw new Error("DEMO_PASSWORD must be at least 12 characters long.");
    }

    await mongoose.connect(process.env.MONGODB_URI);
    try {
        const passwordHash = await bcrypt.hash(password, 12);
        const user = await User.findOneAndUpdate(
            { email: DEMO_EMAIL },
            { $set: { name: "SmartSpend Demo", email: DEMO_EMAIL, password: passwordHash } },
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
        );

        // Re-running the script refreshes only this reserved demo account's sample records.
        await Promise.all([
            Expense.deleteMany({ user: user._id }),
            Budget.deleteMany({ user: user._id }),
        ]);

        const demo = buildDemoData();
        await Promise.all([
            Expense.insertMany(demo.expenses.map((expense) => ({ ...expense, user: user._id }))),
            Budget.insertMany(demo.budgets.map((budget) => ({ ...budget, user: user._id }))),
        ]);

        const { finalPrediction } = forecastNextMonth(demo.monthlyTotals.map(({ amount }) => amount));
        console.log("Demo account and synthetic history created.");
        console.log(`Email: ${DEMO_EMAIL}`);
        console.log(`Password: ${password}`);
        console.log(`History: ${demo.startMonth} through ${demo.endMonth} (24 complete months)`);
        console.log(`Expenses: ${demo.expenses.length}; budgets: ${demo.budgets.length}`);
        console.log(`Forecast target: ${demo.targetMonth}; predicted monthly spending: ₹${finalPrediction.toLocaleString("en-IN")}`);
        console.log("This synthetic account is for local demonstrations only. Use a new password outside development.");
    } finally {
        await mongoose.disconnect();
    }
};

seedDemoData().catch((error) => {
    console.error(`Demo seed failed: ${error.message}`);
    process.exitCode = 1;
});

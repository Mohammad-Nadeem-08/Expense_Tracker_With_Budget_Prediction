const fs = require("fs");
const path = require("path");
const { buildDemoData } = require("../services/demoData");
const { forecastNextMonth, walkForwardBacktest } = require("../services/forecasting");

const demo = buildDemoData();
const values = demo.monthlyTotals.map(({ amount }) => amount);
const forecast = forecastNextMonth(values);
const report = {
    accountEmail: process.env.DEMO_EMAIL || "demo@smartspend.local",
    startMonth: demo.startMonth,
    endMonth: demo.endMonth,
    targetMonth: demo.targetMonth,
    transactionCount: demo.expenses.length,
    monthlyHistory: demo.monthlyTotals,
    predictions: forecast.predictions,
    finalPrediction: forecast.finalPrediction,
    walkForwardValidation: walkForwardBacktest(values),
};

const dataDirectory = path.join(__dirname, "..", "data");
fs.mkdirSync(dataDirectory, { recursive: true });
const csvHeader = "date,amount,category,paymentMethod,description";
const csvRows = demo.expenses.map((expense) => [
    expense.date.slice(0, 10),
    expense.amount.toFixed(2),
    expense.category,
    expense.paymentMethod,
    `"${expense.description.replaceAll('"', '""')}"`,
].join(","));
fs.writeFileSync(path.join(dataDirectory, "demo-expenses.csv"), `${csvHeader}\n${csvRows.join("\n")}\n`);
fs.writeFileSync(path.join(dataDirectory, "demo-forecast.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
console.log(`\nWrote ${demo.expenses.length} synthetic transactions to server/data/demo-expenses.csv`);

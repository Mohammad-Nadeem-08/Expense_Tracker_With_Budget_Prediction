const CATEGORY_SHARES = [
    { category: "Food", share: 0.32 },
    { category: "Transport", share: 0.18 },
    { category: "Bills", share: 0.24 },
    { category: "Shopping", share: 0.13 },
    { category: "Healthcare", share: 0.08 },
    { category: "Education", share: 0.05 },
];

const SEASONAL_FACTORS = [0.96, 0.98, 1.01, 0.99, 1.00, 1.02, 0.97, 1.00, 1.03, 1.01, 1.08, 1.05];
const MONTHLY_VARIATION = [0, 0.012, -0.008, 0.016, -0.01, 0.006, -0.014, 0.01];

const monthKey = (date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
const roundMoney = (value) => Number(value.toFixed(2));

const buildDemoData = (referenceDate = new Date()) => {
    const currentMonth = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1));
    const firstMonth = new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() - 24, 1));
    const expenses = [];
    const monthlyTotals = [];

    for (let index = 0; index < 24; index += 1) {
        const date = new Date(Date.UTC(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + index, 1));
        const month = date.getUTCMonth();
        const year = date.getUTCFullYear();
        const base = 16500 + index * 185;
        const total = roundMoney(base * SEASONAL_FACTORS[month] * (1 + MONTHLY_VARIATION[index % MONTHLY_VARIATION.length]));
        const key = monthKey(date);
        let allocated = 0;

        CATEGORY_SHARES.forEach(({ category, share }, categoryIndex) => {
            const amount = categoryIndex === CATEGORY_SHARES.length - 1
                ? roundMoney(total - allocated)
                : roundMoney(total * share);
            allocated = roundMoney(allocated + amount);
            const day = 3 + categoryIndex * 4;
            expenses.push({
                amount,
                category,
                date: new Date(Date.UTC(year, month, day, 12)).toISOString(),
                paymentMethod: ["UPI", "Cash", "Card"][categoryIndex % 3],
                description: `Demo ${category.toLowerCase()} expense for ${key}`,
            });
        });
        monthlyTotals.push({ month: key, amount: total });
    }

    const finalMonth = new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() - 1, 1));
    const targetDate = new Date(Date.UTC(finalMonth.getUTCFullYear(), finalMonth.getUTCMonth() + 1, 1));
    const targetYear = targetDate.getUTCFullYear();
    const targetMonth = targetDate.getUTCMonth() + 1;
    const nextMonthEstimate = monthlyTotals[monthlyTotals.length - 1].amount * 1.04;
    const budgets = [{
        category: "Overall",
        amount: roundMoney(nextMonthEstimate * 1.1),
        year: targetYear,
        month: targetMonth,
    }, ...CATEGORY_SHARES.map(({ category, share }) => ({
        category,
        amount: roundMoney(nextMonthEstimate * share * 1.1),
        year: targetYear,
        month: targetMonth,
    }))];

    return {
        startMonth: monthlyTotals[0].month,
        endMonth: monthlyTotals[monthlyTotals.length - 1].month,
        targetMonth: monthKey(targetDate),
        expenses,
        budgets,
        monthlyTotals,
    };
};

module.exports = { buildDemoData, CATEGORY_SHARES };

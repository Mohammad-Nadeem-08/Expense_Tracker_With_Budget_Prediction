const express = require("express");

const {
    createBudget,
    getBudgets,
    getBudgetsByMonth,
    getBudgetSummary,
    updateBudget,
    deleteBudget,
} = require("../controllers/budgetController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


// Every budget request requires login
router.use(authMiddleware);


router.post("/", createBudget);

router.get("/", getBudgets);

router.get(
    "/summary/:month/:year",
    getBudgetSummary
);

router.get(
    "/:month/:year",
    getBudgetsByMonth
);

router.put(
    "/:id",
    updateBudget
);

router.delete(
    "/:id",
    deleteBudget
);


module.exports = router;
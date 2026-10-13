const dotenv = require("dotenv");

// Load configuration before importing route modules.
dotenv.config();

const express = require("express");
const cors = require("cors");
const expenseRoutes = require("./routes/expenseRoutes");
const connectDB = require("./config/db");
const budgetRoutes = require("./routes/budgetRoutes");
const authRoutes = require('./routes/authRoutes');
const predictionRoutes = require("./routes/predictionRoutes");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/expenses", expenseRoutes);
app.use("/api/budgets", budgetRoutes);
app.use('/api/auth', authRoutes);
app.use("/api/prediction", predictionRoutes);

app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "ok"
    });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("MONGODB_URI is required. Add it to your server/.env file.");
        }

        await connectDB();

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Server startup aborted:", error.message);
        process.exit(1);
    }
};

startServer();

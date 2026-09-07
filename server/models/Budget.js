const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },

        amount: {
            type: Number,
            required: true,
            validate: {
                validator: (value) => value > 0,
                message: "Budget amount must be greater than 0",
            },
        },

        category: {
            type: String,
            required: true,
            trim: true,
        },

        month: {
            type: Number,
            required: true,
            min: 1,
            max: 12,
        },

        year: {
            type: Number,
            required: true,
            min: 2000,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("Budget", budgetSchema);
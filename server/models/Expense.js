const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        amount: {
            type: Number,
            required: true,
            validate: {
                validator: (value) => value > 0,
                message: 'Amount must be greater than 0',
            },
        },

        category: {
            type: String,
            required: true,
            trim: true,
        },

        date: {
            type: Date,
            required: true,
        },

        paymentMethod: {
            type: String,
            required: true,
        },

        description: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

expenseSchema.index({ user: 1, date: -1 });
expenseSchema.index({ user: 1, category: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
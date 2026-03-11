const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    loanId: { type: mongoose.Schema.Types.ObjectId, ref: "Loan",  required: [true, "Loan ID required"] },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User",  required: [true, "User ID required"] },
    amount: { type: Number, required: [true, "Amount is required"], min: [0.01, "Must be > 0"] },
    type:   { type: String, enum: ["Credit", "Debit"], required: [true, "Type is required"] },
    note:   { type: String, trim: true, maxlength: 500 },
    date:   { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Indexes: fast lookups by loan or user
transactionSchema.index({ loanId: 1, date: -1 });
transactionSchema.index({ userId: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);

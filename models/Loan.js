const mongoose = require("mongoose");

const loanSchema = new mongoose.Schema(
  {
    borrowerName: { type: String, required: [true, "Borrower name is required"], trim: true },
    phone:        { type: String, required: [true, "Phone is required"], trim: true },
    amount:       { type: Number, required: [true, "Amount is required"], min: [1, "Must be > 0"] },
    interestRate: { type: Number, required: [true, "Interest rate is required"], min: 0 },
    duration:     { type: Date,   required: [true, "Duration date is required"] },
    status:       { type: String, enum: ["Active", "Inactive"], default: "Active" },
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// Virtual link to transactions (used in populate calls)
loanSchema.virtual("transactions", {
  ref: "Transaction",
  localField: "_id",
  foreignField: "loanId",
});
loanSchema.set("toObject", { virtuals: true });
loanSchema.set("toJSON",   { virtuals: true });

// Index: fast user-scoped loan queries
loanSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Loan", loanSchema);

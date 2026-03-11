const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Loan = require("../models/Loan");
const Transaction = require("../models/Transaction");
const { protect } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

// ── POST /api/loans  — Create loan ───────────────────────────
router.post(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const { borrowerName, phone, amount, interestRate, duration, status } = req.body;

    if (!borrowerName || !phone || !amount || !interestRate || !duration)
      return res.status(400).json({ message: "borrowerName, phone, amount, interestRate and duration are required" });

    const loan = await Loan.create({
      borrowerName: borrowerName.trim(),
      phone: phone.trim(),
      amount: Number(amount),
      interestRate: Number(interestRate),
      duration,
      status: status || "Active",
      userId: req.user._id,
    });

    res.status(201).json(loan);
  })
);

// ── GET /api/loans  — All loans with transaction totals ───────
// Original: N+1 queries (1 per loan). Fixed: single aggregation pipeline.
router.get(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const loans = await Loan.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user._id) } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "transactions",
          localField: "_id",
          foreignField: "loanId",
          as: "transactions",
        },
      },
      {
        $addFields: {
          totalCredit: {
            $sum: {
              $map: {
                input: { $filter: { input: "$transactions", cond: { $eq: ["$$this.type", "Credit"] } } },
                as: "t",
                in: "$$t.amount",
              },
            },
          },
          totalDebit: {
            $sum: {
              $map: {
                input: { $filter: { input: "$transactions", cond: { $eq: ["$$this.type", "Debit"] } } },
                as: "t",
                in: "$$t.amount",
              },
            },
          },
        },
      },
      // Don't send full transaction array in list view
      { $project: { transactions: 0 } },
    ]);

    res.json(loans);
  })
);

// ── PUT /api/loans/:id  — Update loan ────────────────────────
router.put(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const loan = await Loan.findOne({ _id: req.params.id, userId: req.user._id });
    if (!loan) return res.status(404).json({ message: "Loan not found" });

    // Only allow updating these fields — prevents userId/id injection
    const allowed = ["borrowerName", "phone", "amount", "interestRate", "duration", "status"];
    allowed.forEach((f) => { if (req.body[f] !== undefined) loan[f] = req.body[f]; });

    const updated = await loan.save();
    res.json(updated);
  })
);

// ── DELETE /api/loans/:id  — Delete loan + cascade ───────────
router.delete(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const loan = await Loan.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!loan) return res.status(404).json({ message: "Loan not found" });

    const { deletedCount } = await Transaction.deleteMany({ loanId: loan._id });

    res.json({
      message: "Loan and related transactions deleted successfully",
      transactionsRemoved: deletedCount,
    });
  })
);

module.exports = router;

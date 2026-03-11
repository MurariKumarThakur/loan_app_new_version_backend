const express = require("express");
const router = express.Router();
const Transaction = require("../models/Transaction");
const Loan = require("../models/Loan");
const { protect } = require("../middleware/auth");
const { asyncHandler } = require("../middleware/errorHandler");

// ── GET /api/transactions/:loanId ────────────────────────────
router.get(
  "/:loanId",
  protect,
  asyncHandler(async (req, res) => {
    // Verify the loan belongs to this user before exposing its transactions
    const loan = await Loan.findOne({ _id: req.params.loanId, userId: req.user._id });
    if (!loan) return res.status(404).json({ message: "Loan not found" });

    const transactions = await Transaction.find({
      loanId: req.params.loanId,
      userId: req.user._id,
    }).sort({ date: -1 });

    res.json(transactions);
  })
);

// ── POST /api/transactions  — Add transaction ────────────────
router.post(
  "/",
  protect,
  asyncHandler(async (req, res) => {
    const { loanId, amount, type, note, date } = req.body;

    if (!loanId || !amount || !type)
      return res.status(400).json({ message: "loanId, amount and type are required" });

    if (!["Credit", "Debit"].includes(type))
      return res.status(400).json({ message: "type must be Credit or Debit" });

    if (Number(amount) <= 0)
      return res.status(400).json({ message: "amount must be greater than 0" });

    // Confirm loan belongs to this user
    const loan = await Loan.findOne({ _id: loanId, userId: req.user._id });
    if (!loan) return res.status(404).json({ message: "Loan not found" });

    const transaction = await Transaction.create({
      loanId,
      userId: req.user._id,
      amount: Number(amount),
      type,
      note: note?.trim(),
      date: date || Date.now(),
    });

    res.status(201).json(transaction);
  })
);

// ── PUT /api/transactions/:id  — Update transaction ──────────
router.put(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!transaction) return res.status(404).json({ message: "Transaction not found" });

    const allowed = ["amount", "type", "note", "date"];
    allowed.forEach((f) => { if (req.body[f] !== undefined) transaction[f] = req.body[f]; });

    const updated = await transaction.save();
    res.json(updated);
  })
);

// ── DELETE /api/transactions/:id ─────────────────────────────
// Original bug: fetched by ID only, then checked userId separately.
// Fixed: single query with both _id + userId — no race condition.
router.delete(
  "/:id",
  protect,
  asyncHandler(async (req, res) => {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!transaction) return res.status(404).json({ message: "Transaction not found" });

    res.json({ message: "Transaction deleted successfully" });
  })
);

module.exports = router;

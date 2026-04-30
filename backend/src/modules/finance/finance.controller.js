const asyncHandler = require("../../lib/async-handler");
const { cleanMultiline, cleanNumber, cleanString } = require("../../utils/sanitize");
const { collect, isDate, isPositiveNumber, required } = require("../../utils/validators");
const service = require("./finance.service");

const listEntries = asyncHandler(async (req, res) => {
  const result = await service.listEntries(req.auth, { month: req.query.month || "" });
  res.json(result);
});

const createEntry = asyncHandler(async (req, res) => {
  const { entryType, category, amount, entryDate, notes } = req.body;
  const errors = collect(
    required(entryType, "Entry type"),
    required(category, "Category"),
    isPositiveNumber(amount, "Amount"),
    isDate(entryDate, "Entry date")
  );

  if (errors.length) {
    return res.status(422).json({ error: { message: "Validation failed.", details: errors } });
  }

  const entry = await service.createEntry(req.auth, {
    entryType: cleanString(entryType, 20),
    category: cleanString(category, 120),
    amount: cleanNumber(amount),
    entryDate,
    notes: cleanMultiline(notes || "", 1000)
  });

  res.status(201).json({ entry });
});

module.exports = {
  createEntry,
  listEntries
};

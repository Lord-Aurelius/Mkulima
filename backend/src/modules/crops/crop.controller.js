const asyncHandler = require("../../lib/async-handler");
const { cleanNumber, cleanString } = require("../../utils/sanitize");
const { collect, isDate, isPositiveNumber, required } = require("../../utils/validators");
const service = require("./crop.service");

const listCrops = asyncHandler(async (req, res) => {
  const crops = await service.listCrops(req.auth, req.query.farmId);
  res.json({ crops });
});

const createCrop = asyncHandler(async (req, res) => {
  const { type, plantingDate, harvestDate, quantity, expectedYield, farmId } = req.body;
  const errors = collect(
    required(type, "Type"),
    isDate(plantingDate, "Planting date"),
    isDate(harvestDate, "Harvest date"),
    isPositiveNumber(quantity, "Quantity"),
    isPositiveNumber(expectedYield, "Expected yield")
  );

  if (errors.length) {
    return res.status(422).json({ error: { message: "Validation failed.", details: errors } });
  }

  const crop = await service.createCrop(req.auth, {
    farmId,
    type: cleanString(type, 160),
    plantingDate,
    harvestDate,
    quantity: cleanNumber(quantity),
    expectedYield: cleanNumber(expectedYield),
    file: req.file || null
  });

  res.status(201).json({ crop });
});

const updateCrop = asyncHandler(async (req, res) => {
  const { type, plantingDate, harvestDate, quantity, expectedYield, farmId } = req.body;
  const errors = collect(
    required(type, "Type"),
    isDate(plantingDate, "Planting date"),
    isDate(harvestDate, "Harvest date"),
    isPositiveNumber(quantity, "Quantity"),
    isPositiveNumber(expectedYield, "Expected yield")
  );

  if (errors.length) {
    return res.status(422).json({ error: { message: "Validation failed.", details: errors } });
  }

  const crop = await service.updateCrop(req.auth, req.params.id, {
    farmId,
    type: cleanString(type, 160),
    plantingDate,
    harvestDate,
    quantity: cleanNumber(quantity),
    expectedYield: cleanNumber(expectedYield)
  });

  res.json({ crop });
});

const deleteCrop = asyncHandler(async (req, res) => {
  const result = await service.deleteCrop(req.auth, req.params.id, req.query.farmId);
  res.json(result);
});

module.exports = {
  createCrop,
  deleteCrop,
  listCrops,
  updateCrop
};

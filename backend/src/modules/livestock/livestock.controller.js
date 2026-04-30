const asyncHandler = require("../../lib/async-handler");
const { cleanMultiline, cleanNumber, cleanString } = require("../../utils/sanitize");
const { collect, isPositiveNumber, required } = require("../../utils/validators");
const service = require("./livestock.service");

const listLivestock = asyncHandler(async (req, res) => {
  const livestock = await service.listLivestock(req.auth, req.query.farmId);
  res.json({ livestock });
});

const createLivestock = asyncHandler(async (req, res) => {
  const { type, count, productionMetric, latestMetricValue, farmId } = req.body;
  const errors = collect(
    required(type, "Type"),
    isPositiveNumber(count, "Count"),
    required(productionMetric, "Production metric"),
    isPositiveNumber(latestMetricValue, "Latest metric value")
  );

  if (errors.length) {
    return res.status(422).json({ error: { message: "Validation failed.", details: errors } });
  }

  const livestock = await service.createLivestock(req.auth, {
    farmId,
    type: cleanString(type, 160),
    count: cleanNumber(count),
    productionMetric: cleanString(productionMetric, 80),
    latestMetricValue: cleanNumber(latestMetricValue),
    file: req.file || null
  });

  res.status(201).json({ livestock });
});

const updateLivestock = asyncHandler(async (req, res) => {
  const { type, count, productionMetric, latestMetricValue, farmId } = req.body;
  const errors = collect(
    required(type, "Type"),
    isPositiveNumber(count, "Count"),
    required(productionMetric, "Production metric"),
    isPositiveNumber(latestMetricValue, "Latest metric value")
  );

  if (errors.length) {
    return res.status(422).json({ error: { message: "Validation failed.", details: errors } });
  }

  const livestock = await service.updateLivestock(req.auth, req.params.id, {
    farmId,
    type: cleanString(type, 160),
    count: cleanNumber(count),
    productionMetric: cleanString(productionMetric, 80),
    latestMetricValue: cleanNumber(latestMetricValue),
    file: req.file || null
  });

  res.json({ livestock });
});

const deleteLivestock = asyncHandler(async (req, res) => {
  const result = await service.deleteLivestock(req.auth, req.params.id, req.query.farmId);
  res.json(result);
});

const addProductionUpdate = asyncHandler(async (req, res) => {
  const { metricValue, metricUnit, notes } = req.body;
  const errors = collect(isPositiveNumber(metricValue, "Metric value"));
  if (errors.length) {
    return res.status(422).json({ error: { message: "Validation failed.", details: errors } });
  }

  const update = await service.addProductionUpdate(req.auth, req.params.id, {
    metricValue: cleanNumber(metricValue),
    metricUnit: cleanString(metricUnit || "", 80),
    notes: cleanMultiline(notes || "", 1000)
  });

  res.status(201).json({ update });
});

const listProductionUpdates = asyncHandler(async (req, res) => {
  const updates = await service.listProductionUpdates(req.auth, req.params.id);
  res.json({ updates });
});

const regenerateLivestockQr = asyncHandler(async (req, res) => {
  const livestock = await service.regenerateLivestockQr(req.auth, req.params.id, req.body?.farmId || req.query.farmId);
  res.json({ livestock });
});

module.exports = {
  addProductionUpdate,
  createLivestock,
  deleteLivestock,
  listLivestock,
  listProductionUpdates,
  regenerateLivestockQr,
  updateLivestock
};

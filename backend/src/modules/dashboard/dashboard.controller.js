const asyncHandler = require("../../lib/async-handler");
const service = require("./dashboard.service");

const getSummary = asyncHandler(async (req, res) => {
  const summary = await service.getSummary(req.auth, req.query.farmId);
  res.json({ summary });
});

const getMonthlyReport = asyncHandler(async (req, res) => {
  const report = await service.getMonthlyReport(req.auth, {
    farmId: req.query.farmId,
    month: req.query.month
  });
  res.json({ report });
});

const getWorkerContribution = asyncHandler(async (req, res) => {
  const contribution = await service.getWorkerContribution(req.auth, {
    month: req.query.month
  });
  res.json({ contribution });
});

module.exports = {
  getMonthlyReport,
  getSummary,
  getWorkerContribution
};

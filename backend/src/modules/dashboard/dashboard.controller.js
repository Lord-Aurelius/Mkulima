const asyncHandler = require("../../lib/async-handler");
const service = require("./dashboard.service");

const getSummary = asyncHandler(async (req, res) => {
  const summary = await service.getSummary(req.auth, req.query.farmId);
  res.json({ summary });
});

module.exports = {
  getSummary
};

const asyncHandler = require("../../lib/async-handler");
const { cleanMultiline, cleanString } = require("../../utils/sanitize");
const { collect, required } = require("../../utils/validators");
const service = require("./log.service");

function parseTargetPayload(rawPayload) {
  if (!rawPayload) {
    return null;
  }

  try {
    return JSON.parse(rawPayload);
  } catch {
    return null;
  }
}

const createLog = asyncHandler(async (req, res) => {
  const task = cleanMultiline(req.body.task, 1500);
  const errors = collect(required(task, "Task"));
  if (errors.length) {
    return res.status(422).json({ error: { message: "Validation failed.", details: errors } });
  }

  const log = await service.createLog(req.auth, {
    task,
    workerId: cleanString(req.body.workerId || "", 120) || null,
    targetPayload: parseTargetPayload(req.body.targetPayload),
    files: req.files || []
  });

  res.status(201).json({ log });
});

const listLogs = asyncHandler(async (req, res) => {
  const logs = await service.listLogs(req.auth, req.query);
  res.json({ logs });
});

module.exports = {
  createLog,
  listLogs
};

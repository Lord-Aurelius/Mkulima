const asyncHandler = require("../../lib/async-handler");
const { cleanMultiline, cleanNumber, cleanString } = require("../../utils/sanitize");
const { collect, isPositiveNumber, required } = require("../../utils/validators");
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
  const hasActivityRecord = [req.body.recordType, req.body.materialType, req.body.quantity, req.body.unit]
    .some((value) => value !== undefined && value !== null && `${value}`.trim() !== "");

  const errors = collect(required(task, "Task"));
  if (hasActivityRecord) {
    errors.push(
      ...collect(
        required(req.body.recordType, "Record type"),
        required(req.body.materialType, "Material type"),
        isPositiveNumber(req.body.quantity, "Quantity"),
        required(req.body.unit, "Unit")
      )
    );
  }
  if (errors.length) {
    return res.status(422).json({ error: { message: "Validation failed.", details: errors } });
  }

  const log = await service.createLog(req.auth, {
    task,
    targetPayload: parseTargetPayload(req.body.targetPayload),
    activityRecord: hasActivityRecord
      ? {
          recordType: cleanString(req.body.recordType, 40),
          materialType: cleanString(req.body.materialType, 80),
          quantity: cleanNumber(req.body.quantity),
          unit: cleanString(req.body.unit, 40),
          notes: cleanMultiline(req.body.recordNotes || "", 1000)
        }
      : null,
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

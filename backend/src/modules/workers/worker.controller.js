const asyncHandler = require("../../lib/async-handler");
const { cleanEmail, cleanNumber, cleanString } = require("../../utils/sanitize");
const { collect, isEmail, isPositiveNumber, minLength, required } = require("../../utils/validators");
const service = require("./worker.service");

function validateWorkerInput(body, { requirePassword }) {
  const errors = collect(
    required(body.name, "Name"),
    required(body.email, "Email"),
    isEmail(cleanEmail(body.email), "Email"),
    required(body.duty, "Duty"),
    isPositiveNumber(body.payRate, "Pay rate"),
    required(body.paymentStatus, "Payment status")
  );

  if (requirePassword) {
    errors.push(...collect(required(body.password, "Password"), minLength(body.password, "Password", 8)));
  }

  return errors;
}

const listWorkers = asyncHandler(async (req, res) => {
  const workers = await service.listWorkers(req.auth, req.query.farmId);
  res.json({ workers });
});

const createWorker = asyncHandler(async (req, res) => {
  const errors = validateWorkerInput(req.body, { requirePassword: true });
  if (errors.length) {
    return res.status(422).json({ error: { message: "Validation failed.", details: errors } });
  }

  const {
    name,
    email,
    password,
    duty,
    farmId,
    assignmentTitle,
    assignmentDescription,
    assignmentDueDate,
    employmentStartDate,
    payRate,
    paymentStatus
  } = req.body;

  const result = await service.createWorker(req.auth, {
    name: cleanString(name, 160),
    email: cleanEmail(email),
    password,
    duty: cleanString(duty, 160),
    farmId,
    assignmentTitle: cleanString(assignmentTitle || "", 160),
    assignmentDescription: cleanString(assignmentDescription || "", 1000),
    assignmentDueDate: assignmentDueDate || null,
    employmentStartDate: employmentStartDate || null,
    payRate: cleanNumber(payRate),
    paymentStatus: cleanString(paymentStatus, 40)
  });

  res.status(201).json(result);
});

const updateWorker = asyncHandler(async (req, res) => {
  const errors = validateWorkerInput(req.body, { requirePassword: false });
  if (errors.length) {
    return res.status(422).json({ error: { message: "Validation failed.", details: errors } });
  }

  const worker = await service.updateWorker(req.auth, req.params.id, {
    name: cleanString(req.body.name, 160),
    email: cleanEmail(req.body.email),
    duty: cleanString(req.body.duty, 160),
    employmentStartDate: req.body.employmentStartDate || null,
    payRate: cleanNumber(req.body.payRate),
    paymentStatus: cleanString(req.body.paymentStatus, 40)
  });

  res.json({ worker });
});

const getWorker = asyncHandler(async (req, res) => {
  const worker = await service.getWorker(req.auth, req.params.id);
  res.json({ worker });
});

const createAssignment = asyncHandler(async (req, res) => {
  const { title, description, dueDate } = req.body;
  const errors = collect(required(title, "Title"), required(description, "Description"));
  if (errors.length) {
    return res.status(422).json({ error: { message: "Validation failed.", details: errors } });
  }

  const assignment = await service.createAssignment(req.auth, req.params.id, {
    title: cleanString(title, 160),
    description: cleanString(description, 1000),
    dueDate: dueDate || null
  });

  res.status(201).json({ assignment });
});

const listAssignments = asyncHandler(async (req, res) => {
  const assignments = await service.listAssignments(req.auth, req.params.id || null);
  res.json({ assignments });
});

const listFarmAssignments = asyncHandler(async (req, res) => {
  const assignments = await service.listFarmAssignments(req.auth);
  res.json({ assignments });
});

const updateAssignmentStatus = asyncHandler(async (req, res) => {
  const errors = collect(required(req.body.status, "Status"));
  if (errors.length) {
    return res.status(422).json({ error: { message: "Validation failed.", details: errors } });
  }

  const assignment = await service.updateAssignmentStatus(
    req.auth,
    req.params.id,
    req.params.assignmentId,
    cleanString(req.body.status, 40)
  );
  res.json({ assignment });
});

module.exports = {
  createAssignment,
  createWorker,
  getWorker,
  listFarmAssignments,
  listAssignments,
  listWorkers,
  updateAssignmentStatus,
  updateWorker
};

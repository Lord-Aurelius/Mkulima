const asyncHandler = require("../../lib/async-handler");
const { cleanEmail, cleanNumber, cleanString } = require("../../utils/sanitize");
const { collect, isEmail, isPositiveNumber, minLength, required } = require("../../utils/validators");
const service = require("./farm.service");

const listFarms = asyncHandler(async (req, res) => {
  const farms = await service.listFarms(req.auth);
  res.json({ farms });
});

const getFarm = asyncHandler(async (req, res) => {
  const farm = await service.getFarmById(req.params.id, req.auth);
  res.json({ farm });
});

const createFarm = asyncHandler(async (req, res) => {
  const { name, location, landSize, admin } = req.body;
  const errors = collect(
    required(name, "Name"),
    required(location, "Location"),
    isPositiveNumber(landSize, "Land size")
  );

  if (admin) {
    errors.push(
      ...collect(
        required(admin.name, "Admin name"),
        required(admin.email, "Admin email"),
        isEmail(cleanEmail(admin.email), "Admin email"),
        required(admin.password, "Admin password"),
        minLength(admin.password, "Admin password", 8)
      )
    );
  }

  if (errors.length) {
    return res.status(422).json({ error: { message: "Validation failed.", details: errors } });
  }

  const farm = await service.createFarm({
    name: cleanString(name, 160),
    location: cleanString(location, 255),
    landSize: cleanNumber(landSize),
    admin: admin
      ? {
          name: cleanString(admin.name, 160),
          email: cleanEmail(admin.email),
          password: admin.password
        }
      : null
  });

  res.status(201).json({ farm });
});

const updateFarm = asyncHandler(async (req, res) => {
  const { name, location, landSize } = req.body;
  const errors = collect(
    required(name, "Name"),
    required(location, "Location"),
    isPositiveNumber(landSize, "Land size")
  );

  if (errors.length) {
    return res.status(422).json({ error: { message: "Validation failed.", details: errors } });
  }

  const farm = await service.updateFarm(req.params.id, {
    name: cleanString(name, 160),
    location: cleanString(location, 255),
    landSize: cleanNumber(landSize)
  });

  res.json({ farm });
});

const deleteFarm = asyncHandler(async (req, res) => {
  const result = await service.deleteFarm(req.params.id);
  res.json(result);
});

const clearFarmRecords = asyncHandler(async (req, res) => {
  const result = await service.clearFarmRecords(req.params.id);
  res.json(result);
});

const assignAdmin = asyncHandler(async (req, res) => {
  const { adminId } = req.body;
  const errors = collect(required(adminId, "Admin ID"));
  if (errors.length) {
    return res.status(422).json({ error: { message: "Validation failed.", details: errors } });
  }

  const admin = await service.assignAdmin(req.params.id, adminId);
  res.json({ admin });
});

module.exports = {
  assignAdmin,
  clearFarmRecords,
  createFarm,
  deleteFarm,
  getFarm,
  listFarms,
  updateFarm
};

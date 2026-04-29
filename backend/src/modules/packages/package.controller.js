const asyncHandler = require("../../lib/async-handler");
const { cleanNumber, cleanString } = require("../../utils/sanitize");
const { collect, required } = require("../../utils/validators");
const service = require("./package.service");

const listPackages = asyncHandler(async (_req, res) => {
  const packages = await service.listPackages();
  res.json({ packages });
});

const createPackage = asyncHandler(async (req, res) => {
  const errors = collect(required(req.body.name, "Name"), required(req.body.slug, "Slug"));
  if (errors.length) {
    return res.status(422).json({ error: { message: "Validation failed.", details: errors } });
  }

  const pkg = await service.createPackage({
    name: cleanString(req.body.name, 160),
    slug: cleanString(req.body.slug, 80).toLowerCase(),
    priceMonthly: cleanNumber(req.body.priceMonthly || 0),
    hasMarketplace: Boolean(req.body.hasMarketplace),
    description: cleanString(req.body.description || "", 1000)
  });

  res.status(201).json({ package: pkg });
});

const assignPackageToFarm = asyncHandler(async (req, res) => {
  const errors = collect(required(req.body.packageId, "Package ID"));
  if (errors.length) {
    return res.status(422).json({ error: { message: "Validation failed.", details: errors } });
  }

  const farm = await service.assignPackageToFarm(req.params.farmId, req.body.packageId);
  res.json({ farm });
});

module.exports = {
  assignPackageToFarm,
  createPackage,
  listPackages
};

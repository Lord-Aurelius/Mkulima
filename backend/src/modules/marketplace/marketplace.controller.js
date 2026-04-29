const asyncHandler = require("../../lib/async-handler");
const { cleanNumber, cleanString } = require("../../utils/sanitize");
const { collect, required } = require("../../utils/validators");
const service = require("./marketplace.service");

const listAds = asyncHandler(async (req, res) => {
  const ads = await service.listAds(req.auth);
  res.json({ ads });
});

const createAd = asyncHandler(async (req, res) => {
  const errors = collect(
    required(req.body.title, "Title"),
    required(req.body.contactPerson, "Contact person"),
    required(req.body.location, "Location"),
    required(req.body.price, "Price"),
    required(req.body.phoneNumber, "Phone number")
  );
  if (errors.length) {
    return res.status(422).json({ error: { message: "Validation failed.", details: errors } });
  }

  const ad = await service.createAd(req.auth, {
    farmId: req.body.farmId || null,
    title: cleanString(req.body.title, 160),
    contactPerson: cleanString(req.body.contactPerson, 160),
    location: cleanString(req.body.location, 255),
    price: cleanNumber(req.body.price),
    phoneNumber: cleanString(req.body.phoneNumber, 40),
    file: req.file || null
  });

  res.status(201).json({ ad });
});

module.exports = {
  createAd,
  listAds
};

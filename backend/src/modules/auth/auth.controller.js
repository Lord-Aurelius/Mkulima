const asyncHandler = require("../../lib/async-handler");
const { collect, isEmail, minLength, required } = require("../../utils/validators");
const { cleanEmail, cleanString } = require("../../utils/sanitize");
const authService = require("./auth.service");

const bootstrap = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const errors = collect(
    required(name, "Name"),
    required(email, "Email"),
    isEmail(cleanEmail(email), "Email"),
    required(password, "Password"),
    minLength(password, "Password", 8)
  );

  if (errors.length) {
    return res.status(422).json({ error: { message: "Validation failed.", details: errors } });
  }

  const result = await authService.bootstrapCreator({
    name: cleanString(name, 160),
    email: cleanEmail(email),
    password
  });

  res.status(201).json(result);
});

const signupRequest = asyncHandler(async (req, res) => {
  const { name, email, password, farmName, location, landSize } = req.body;
  const errors = collect(
    required(name, "Name"),
    required(email, "Email"),
    isEmail(cleanEmail(email), "Email"),
    required(password, "Password"),
    minLength(password, "Password", 8),
    required(farmName, "Farm name"),
    required(location, "Location"),
    required(landSize, "Land size")
  );

  if (errors.length) {
    return res.status(422).json({ error: { message: "Validation failed.", details: errors } });
  }

  const request = await authService.createSignupRequest({
    name,
    email,
    password,
    farmName,
    location,
    landSize: Number(landSize)
  });

  res.status(201).json({ request });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const errors = collect(required(email, "Email"), required(password, "Password"));
  if (errors.length) {
    return res.status(422).json({ error: { message: "Validation failed.", details: errors } });
  }

  const result = await authService.login({ email, password });
  res.json(result);
});

const qrLogin = asyncHandler(async (req, res) => {
  const { qrToken } = req.body;
  const errors = collect(required(qrToken, "QR token"));
  if (errors.length) {
    return res.status(422).json({ error: { message: "Validation failed.", details: errors } });
  }

  const result = await authService.loginWithQr({ qrToken });
  res.json(result);
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.auth.sub);
  res.json({
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      duty: user.duty,
      farmId: user.farm_id,
      farmName: user.farm_name,
      farmLogoUrl: user.farm_logo_url,
      packageName: user.package_name,
      hasMarketplace: user.has_marketplace
    }
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const errors = collect(
    required(currentPassword, "Current password"),
    required(newPassword, "New password"),
    minLength(newPassword, "New password", 8)
  );
  if (errors.length) {
    return res.status(422).json({ error: { message: "Validation failed.", details: errors } });
  }

  const result = await authService.changePassword(req.auth.sub, currentPassword, newPassword);
  res.json(result);
});

const listSignupRequests = asyncHandler(async (_req, res) => {
  const requests = await authService.listSignupRequests();
  res.json({ requests });
});

const approveSignupRequest = asyncHandler(async (req, res) => {
  const result = await authService.approveSignupRequest(req.params.id);
  res.json(result);
});

const rejectSignupRequest = asyncHandler(async (req, res) => {
  const result = await authService.rejectSignupRequest(req.params.id);
  res.json(result);
});

module.exports = {
  approveSignupRequest,
  bootstrap,
  changePassword,
  login,
  listSignupRequests,
  me,
  qrLogin,
  rejectSignupRequest,
  signupRequest
};

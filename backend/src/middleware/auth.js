const jwt = require("jsonwebtoken");
const env = require("../config/env");
const AppError = require("../lib/app-error");

function requireAuth(req, _res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return next(new AppError(401, "Authentication required."));
  }

  try {
    req.auth = jwt.verify(token, env.jwtSecret);
    return next();
  } catch (error) {
    return next(new AppError(401, "Invalid or expired token."));
  }
}

function requireRoles(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.auth) {
      return next(new AppError(401, "Authentication required."));
    }

    if (!allowedRoles.includes(req.auth.role)) {
      return next(new AppError(403, "You are not allowed to perform this action."));
    }

    return next();
  };
}

function requireSameFarmOrCreator(req, _res, next) {
  if (req.auth.role === "creator") {
    return next();
  }

  const requestedFarmId = req.params.farmId || req.body.farmId || req.query.farmId;
  if (requestedFarmId && requestedFarmId !== req.auth.farmId) {
    return next(new AppError(403, "You can only access your farm."));
  }

  return next();
}

module.exports = {
  requireAuth,
  requireRoles,
  requireSameFarmOrCreator
};

const logger = require("../lib/logger");
const env = require("../config/env");

function errorHandler(error, _req, res, _next) {
  let statusCode = error.statusCode || 500;
  let message = error.message || "Internal server error.";
  let details = error.details || null;

  if (error.code === "23505") {
    statusCode = 409;
    message = "A record with the same unique value already exists.";
  }

  if (error.code === "23503") {
    statusCode = 422;
    message = "A referenced record could not be found.";
  }

  if (error.code === "LIMIT_FILE_SIZE") {
    statusCode = 413;
    message = "Uploaded image is too large.";
  }

  if (statusCode >= 500) {
    logger.error(error.message, { stack: error.stack, details: error.details, code: error.code });
    if (env.nodeEnv === "production") {
      message = "Internal server error.";
      details = null;
    }
  }

  res.status(statusCode).json({
    error: {
      message,
      details
    }
  });
}

module.exports = errorHandler;

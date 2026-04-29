const AppError = require("../lib/app-error");

function validate(schema) {
  return (req, _res, next) => {
    const errors = schema(req);
    if (errors.length) {
      return next(new AppError(422, "Validation failed.", errors));
    }
    return next();
  };
}

module.exports = validate;

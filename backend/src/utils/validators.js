function required(value, label) {
  if (value === undefined || value === null || value === "") {
    return `${label} is required.`;
  }
  return null;
}

function minLength(value, label, length) {
  if (typeof value !== "string" || value.length < length) {
    return `${label} must be at least ${length} characters.`;
  }
  return null;
}

function isEmail(value, label) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value || "")) {
    return `${label} must be a valid email.`;
  }
  return null;
}

function isPositiveNumber(value, label) {
  if (!Number.isFinite(Number(value)) || Number(value) < 0) {
    return `${label} must be a positive number.`;
  }
  return null;
}

function isDate(value, label) {
  if (!value || Number.isNaN(Date.parse(value))) {
    return `${label} must be a valid date.`;
  }
  return null;
}

function collect(...errors) {
  return errors.filter(Boolean);
}

module.exports = {
  collect,
  isDate,
  isEmail,
  isPositiveNumber,
  minLength,
  required
};

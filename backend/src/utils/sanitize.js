function cleanString(value, maxLength = 255) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanMultiline(value, maxLength = 3000) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\r/g, "").trim().slice(0, maxLength);
}

function cleanEmail(value) {
  return cleanString(value, 120).toLowerCase();
}

function cleanNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

module.exports = {
  cleanEmail,
  cleanMultiline,
  cleanNumber,
  cleanString
};

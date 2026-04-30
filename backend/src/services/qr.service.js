const QRCode = require("qrcode");
const env = require("../config/env");

function normalizePayload(payload) {
  return typeof payload === "string" ? payload : JSON.stringify(payload);
}

function createQrDestinationUrl(payload) {
  const serializedPayload = normalizePayload(payload);
  const qrParam = Buffer.from(serializedPayload, "utf8").toString("base64url");
  const baseUrl = env.publicAppUrl || env.appOrigins[0] || "http://127.0.0.1:4173";
  return `${baseUrl}/?qr=${encodeURIComponent(qrParam)}`;
}

async function createQrCodeDataUrl(payload) {
  return QRCode.toDataURL(createQrDestinationUrl(payload), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220
  });
}

module.exports = {
  createQrCodeDataUrl,
  createQrDestinationUrl
};

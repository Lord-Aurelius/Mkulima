const QRCode = require("qrcode");
const env = require("../config/env");

const qrCache = new Map();
const maxCacheEntries = 500;

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
  const destinationUrl = createQrDestinationUrl(payload);
  const cached = qrCache.get(destinationUrl);
  if (cached) {
    return cached;
  }

  const dataUrl = await QRCode.toDataURL(destinationUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220
  });

  if (qrCache.size >= maxCacheEntries) {
    qrCache.delete(qrCache.keys().next().value);
  }
  qrCache.set(destinationUrl, dataUrl);
  return dataUrl;
}

module.exports = {
  createQrCodeDataUrl,
  createQrDestinationUrl
};

const QRCode = require("qrcode");

async function createQrCodeDataUrl(payload) {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220
  });
}

module.exports = {
  createQrCodeDataUrl
};

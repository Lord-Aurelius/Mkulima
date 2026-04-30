const multer = require("multer");
const env = require("../config/env");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Math.max(env.maxImageSizeMb, 12) * 1024 * 1024,
    files: 4
  },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      return callback(new Error("Only image uploads are allowed."));
    }

    return callback(null, true);
  }
});

module.exports = upload;

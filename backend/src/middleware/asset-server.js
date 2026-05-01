const { getStoredAsset } = require("../services/storage.service");

async function serveDatabaseAsset(req, res, next) {
  try {
    const key = req.params[0];
    if (!key) {
      return next();
    }

    const asset = await getStoredAsset(key);
    if (!asset) {
      return next();
    }

    res.setHeader("Content-Type", asset.content_type);
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");
    return res.send(asset.image_data);
  } catch (error) {
    return next(error);
  }
}

module.exports = serveDatabaseAsset;

const { query } = require("../../config/db");
const AppError = require("../../lib/app-error");
const { uploadImage } = require("../../services/storage.service");
const { getPackageForFarm } = require("../../services/package.service");

async function assertMarketplaceAccess(auth) {
  if (auth.role === "creator") {
    return;
  }

  const farmPackage = await getPackageForFarm(auth.farmId);
  if (!farmPackage?.has_marketplace) {
    throw new AppError(403, "Marketplace is available on the premium package only.");
  }
}

async function listAds(auth) {
  await assertMarketplaceAccess(auth);

  const result = await query(
    `
      SELECT ma.id, ma.title, ma.contact_person, ma.location, ma.price, ma.phone_number,
             ma.image_url, ma.created_at, f.name AS farm_name
      FROM marketplace_ads ma
      INNER JOIN farms f ON f.id = ma.farm_id
      ORDER BY ma.created_at DESC
    `
  );

  return result.rows;
}

async function createAd(auth, payload) {
  await assertMarketplaceAccess(auth);
  const farmId = auth.role === "creator" ? payload.farmId : auth.farmId;
  let image = null;
  if (payload.file) {
    image = await uploadImage({ file: payload.file, folder: `marketplace/${farmId}` });
  }

  const result = await query(
    `
      INSERT INTO marketplace_ads (
        farm_id, title, contact_person, location, price, phone_number,
        image_url, storage_key, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,
    [
      farmId,
      payload.title,
      payload.contactPerson,
      payload.location,
      payload.price,
      payload.phoneNumber,
      image ? image.url : null,
      image ? image.key : null,
      auth.sub
    ]
  );

  return result.rows[0];
}

module.exports = {
  createAd,
  listAds
};

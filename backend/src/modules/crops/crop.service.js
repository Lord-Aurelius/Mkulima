const { query } = require("../../config/db");
const AppError = require("../../lib/app-error");
const { createQrCodeDataUrl, createQrDestinationUrl } = require("../../services/qr.service");
const { uploadImage } = require("../../services/storage.service");

function resolveFarm(auth, farmId) {
  return auth.role === "creator" ? farmId : auth.farmId;
}

async function decorateCrop(crop) {
  const qrPayload = JSON.stringify({
    targetType: "crop",
    qrToken: crop.qr_token,
    farmId: crop.farm_id,
    targetId: crop.id,
    label: crop.type
  });

  return {
    ...crop,
    qrPayload,
    qrUrl: createQrDestinationUrl(qrPayload),
    qrCodeDataUrl: await createQrCodeDataUrl(qrPayload)
  };
}

async function listCrops(auth, farmId) {
  const scopedFarmId = resolveFarm(auth, farmId);
  const result = await query(
    `
      SELECT id, farm_id, type, qr_token, image_url, storage_key, planting_date, expected_harvest_date, quantity, expected_yield,
             GREATEST((expected_harvest_date - CURRENT_DATE), 0) AS days_to_harvest
      FROM crops
      WHERE farm_id = $1
      ORDER BY expected_harvest_date ASC
    `,
    [scopedFarmId]
  );

  return Promise.all(result.rows.map(decorateCrop));
}

async function createCrop(auth, payload) {
  const farmId = resolveFarm(auth, payload.farmId);
  let image = null;
  if (payload.file) {
    image = await uploadImage({ file: payload.file, folder: `crops/${farmId}` });
  }
  const result = await query(
    `
      INSERT INTO crops (farm_id, type, image_url, storage_key, planting_date, expected_harvest_date, quantity, expected_yield, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `,
    [farmId, payload.type, image ? image.url : null, image ? image.key : null, payload.plantingDate, payload.harvestDate, payload.quantity, payload.expectedYield, auth.sub]
  );
  return decorateCrop(result.rows[0]);
}

async function updateCrop(auth, cropId, payload) {
  const farmId = resolveFarm(auth, payload.farmId || auth.farmId);
  const result = await query(
    `
      UPDATE crops
      SET type = $2,
          planting_date = $3,
          expected_harvest_date = $4,
          quantity = $5,
          expected_yield = $6
      WHERE id = $1 AND farm_id = $7
      RETURNING *
    `,
    [cropId, payload.type, payload.plantingDate, payload.harvestDate, payload.quantity, payload.expectedYield, farmId]
  );

  if (!result.rowCount) {
    throw new AppError(404, "Crop not found.");
  }

  return decorateCrop(result.rows[0]);
}

async function deleteCrop(auth, cropId, farmId) {
  const scopedFarmId = resolveFarm(auth, farmId || auth.farmId);
  const result = await query("DELETE FROM crops WHERE id = $1 AND farm_id = $2 RETURNING id", [cropId, scopedFarmId]);
  if (!result.rowCount) {
    throw new AppError(404, "Crop not found.");
  }
  return { success: true };
}

module.exports = {
  createCrop,
  deleteCrop,
  listCrops,
  updateCrop
};

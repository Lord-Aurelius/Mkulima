const { query, withTransaction } = require("../../config/db");
const AppError = require("../../lib/app-error");
const { createQrCodeDataUrl, createQrDestinationUrl } = require("../../services/qr.service");
const { uploadImage } = require("../../services/storage.service");

function resolveFarm(auth, farmId) {
  return auth.role === "creator" ? farmId : auth.farmId;
}

async function decorateLivestock(record, { includeQrCode = true } = {}) {
  const qrPayload = JSON.stringify({
    targetType: "livestock",
    qrToken: record.qr_token,
    farmId: record.farm_id,
    targetId: record.id,
    label: record.type
  });

  return {
    ...record,
    qrPayload,
    qrUrl: createQrDestinationUrl(qrPayload),
    qrCodeDataUrl: includeQrCode ? await createQrCodeDataUrl(qrPayload) : null
  };
}

async function listLivestock(auth, farmId) {
  const scopedFarmId = resolveFarm(auth, farmId);
  const result = await query(
    `
      SELECT id, farm_id, type, qr_token, image_url, storage_key, count, production_metric, latest_metric_value, updated_at
      FROM livestock
      WHERE farm_id = $1
      ORDER BY updated_at DESC
    `,
    [scopedFarmId]
  );
  return Promise.all(result.rows.map((record) => decorateLivestock(record, { includeQrCode: auth.role !== "worker" })));
}

async function createLivestock(auth, payload) {
  const farmId = resolveFarm(auth, payload.farmId);
  let image = null;
  if (payload.file) {
    image = await uploadImage({ file: payload.file, folder: `livestock/${farmId}` });
  }
  const result = await query(
    `
      INSERT INTO livestock (farm_id, type, image_url, storage_key, count, production_metric, latest_metric_value, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
    [farmId, payload.type, image ? image.url : null, image ? image.key : null, payload.count, payload.productionMetric, payload.latestMetricValue, auth.sub]
  );
  return decorateLivestock(result.rows[0]);
}

async function updateLivestock(auth, livestockId, payload) {
  const farmId = resolveFarm(auth, payload.farmId || auth.farmId);
  let image = null;
  if (payload.file) {
    image = await uploadImage({ file: payload.file, folder: `livestock/${farmId}` });
  }
  const result = await query(
    `
      UPDATE livestock
      SET type = $2,
          count = $3,
          production_metric = $4,
          latest_metric_value = $5,
          image_url = COALESCE($7, image_url),
          storage_key = COALESCE($8, storage_key)
      WHERE id = $1 AND farm_id = $6
      RETURNING *
    `,
    [
      livestockId,
      payload.type,
      payload.count,
      payload.productionMetric,
      payload.latestMetricValue,
      farmId,
      image ? image.url : null,
      image ? image.key : null
    ]
  );

  if (!result.rowCount) {
    throw new AppError(404, "Livestock record not found.");
  }

  return decorateLivestock(result.rows[0]);
}

async function deleteLivestock(auth, livestockId, farmId) {
  const scopedFarmId = resolveFarm(auth, farmId || auth.farmId);
  const result = await query(
    "DELETE FROM livestock WHERE id = $1 AND farm_id = $2 RETURNING id",
    [livestockId, scopedFarmId]
  );
  if (!result.rowCount) {
    throw new AppError(404, "Livestock record not found.");
  }
  return { success: true };
}

async function addProductionUpdate(auth, livestockId, payload) {
  return withTransaction(async (client) => {
    const livestockResult = await client.query(
      "SELECT id, farm_id FROM livestock WHERE id = $1 LIMIT 1",
      [livestockId]
    );

    if (!livestockResult.rowCount) {
      throw new AppError(404, "Livestock record not found.");
    }

    const livestock = livestockResult.rows[0];
    if (auth.role !== "creator" && livestock.farm_id !== auth.farmId) {
      throw new AppError(403, "You can only update livestock from your farm.");
    }

    const updateResult = await client.query(
      `
        INSERT INTO livestock_updates (livestock_id, farm_id, worker_id, metric_value, notes)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [livestockId, livestock.farm_id, auth.role === "worker" ? auth.sub : null, payload.metricValue, payload.notes]
    );

    await client.query(
      `
        UPDATE livestock
        SET latest_metric_value = $2,
            production_metric = COALESCE(NULLIF($3, ''), production_metric)
        WHERE id = $1
      `,
      [livestockId, payload.metricValue, payload.metricUnit || ""]
    );

    return updateResult.rows[0];
  });
}

async function listProductionUpdates(auth, livestockId) {
  const result = await query(
    `
      SELECT lu.id, lu.metric_value, lu.notes, lu.created_at, lu.worker_id, u.name AS worker_name
      FROM livestock_updates lu
      LEFT JOIN users u ON u.id = lu.worker_id
      INNER JOIN livestock l ON l.id = lu.livestock_id
      WHERE lu.livestock_id = $1
        AND ($2 = 'creator' OR l.farm_id = $3)
      ORDER BY lu.created_at DESC
    `,
    [livestockId, auth.role, auth.farmId]
  );

  return result.rows;
}

async function regenerateLivestockQr(auth, livestockId, farmId) {
  const scopedFarmId = resolveFarm(auth, farmId || auth.farmId);
  const result = await query(
    `
      UPDATE livestock
      SET qr_token = gen_random_uuid()
      WHERE id = $1 AND farm_id = $2
      RETURNING *
    `,
    [livestockId, scopedFarmId]
  );

  if (!result.rowCount) {
    throw new AppError(404, "Livestock record not found.");
  }

  return decorateLivestock(result.rows[0]);
}

module.exports = {
  addProductionUpdate,
  createLivestock,
  deleteLivestock,
  listLivestock,
  listProductionUpdates,
  regenerateLivestockQr,
  updateLivestock
};

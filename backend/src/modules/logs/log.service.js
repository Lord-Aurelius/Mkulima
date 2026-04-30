const { query, withTransaction } = require("../../config/db");
const AppError = require("../../lib/app-error");
const { uploadImage } = require("../../services/storage.service");

async function resolveWorker(auth, workerId, client) {
  if (auth.role !== "worker") {
    throw new AppError(403, "Only workers can submit daily logs.");
  }

  return { id: auth.sub, farm_id: auth.farmId };
}

async function resolveTarget(auth, targetPayload, client) {
  if (!targetPayload?.targetType || !targetPayload?.qrToken) {
    return {
      targetType: "general",
      targetId: null,
      targetLabel: null
    };
  }

  if (targetPayload.targetType === "crop") {
    const result = await client.query(
      `
        SELECT id, farm_id, type
        FROM crops
        WHERE qr_token = $1
        LIMIT 1
      `,
      [targetPayload.qrToken]
    );
    if (!result.rowCount) {
      throw new AppError(404, "Crop QR code not found.");
    }
    const crop = result.rows[0];
    if (auth.role !== "creator" && crop.farm_id !== auth.farmId) {
      throw new AppError(403, "You can only log work for your farm.");
    }
    return { targetType: "crop", targetId: crop.id, targetLabel: crop.type, farmId: crop.farm_id };
  }

  if (targetPayload.targetType === "livestock") {
    const result = await client.query(
      `
        SELECT id, farm_id, type
        FROM livestock
        WHERE qr_token = $1
        LIMIT 1
      `,
      [targetPayload.qrToken]
    );
    if (!result.rowCount) {
      throw new AppError(404, "Livestock QR code not found.");
    }
    const livestock = result.rows[0];
    if (auth.role !== "creator" && livestock.farm_id !== auth.farmId) {
      throw new AppError(403, "You can only log work for your farm.");
    }
    return { targetType: "livestock", targetId: livestock.id, targetLabel: livestock.type, farmId: livestock.farm_id };
  }

  throw new AppError(422, "Unsupported QR target type.");
}

async function createLog(auth, { task, files, workerId, targetPayload }) {
  const uploadedImages = [];
  for (const file of files) {
    uploadedImages.push(await uploadImage({ file, folder: `logs/${auth.farmId || "shared"}` }));
  }

  return withTransaction(async (client) => {
    const worker = await resolveWorker(auth, workerId, client);
    const target = await resolveTarget(auth, targetPayload, client);
    const farmId = target.farmId || worker.farm_id;

    const logResult = await client.query(
      `
        INSERT INTO daily_logs (farm_id, worker_id, target_type, target_id, target_label, task)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `,
      [farmId, worker.id, target.targetType, target.targetId, target.targetLabel, task]
    );

    const log = logResult.rows[0];

    for (let index = 0; index < uploadedImages.length; index += 1) {
      const image = uploadedImages[index];
      await client.query(
        `
          INSERT INTO daily_log_images (log_id, storage_key, image_url, sort_order)
          VALUES ($1, $2, $3, $4)
        `,
        [log.id, image.key, image.url, index]
      );
    }

    return {
      ...log,
      images: uploadedImages.map((image) => image.url)
    };
  });
}

async function listLogs(auth, { farmId, workerId, limit = 25 }) {
  const params = [];
  const conditions = [];

  if (auth.role === "worker") {
    params.push(auth.sub);
    conditions.push(`l.worker_id = $${params.length}`);
  } else if (workerId) {
    params.push(workerId);
    conditions.push(`l.worker_id = $${params.length}`);
  }

  const scopedFarmId = auth.role === "creator" ? farmId : auth.farmId;
  if (scopedFarmId) {
    params.push(scopedFarmId);
    conditions.push(`l.farm_id = $${params.length}`);
  }

  params.push(Math.min(Number(limit) || 25, 100));
  const whereSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await query(
    `
      SELECT l.id, l.task, l.created_at, l.farm_id, l.worker_id, l.target_type, l.target_id, l.target_label,
             u.name AS worker_name,
             COALESCE(
               JSON_AGG(
                 JSON_BUILD_OBJECT('id', i.id, 'url', i.image_url, 'sortOrder', i.sort_order)
               ) FILTER (WHERE i.id IS NOT NULL),
               '[]'
             ) AS images
      FROM daily_logs l
      INNER JOIN users u ON u.id = l.worker_id
      LEFT JOIN daily_log_images i ON i.log_id = l.id
      ${whereSql}
      GROUP BY l.id, u.name
      ORDER BY l.created_at DESC
      LIMIT $${params.length}
    `,
    params
  );

  return result.rows;
}

module.exports = {
  createLog,
  listLogs
};

const { query } = require("../../config/db");
const { uploadImage } = require("../../services/storage.service");

function resolveFarm(auth, farmId) {
  return auth.role === "creator" ? farmId : auth.farmId;
}

async function listPosts(auth, farmId) {
  const scopedFarmId = resolveFarm(auth, farmId);
  const result = await query(
    `
      SELECT id, farm_id, title, body, image_url, created_at
      FROM education_posts
      WHERE farm_id = $1
      ORDER BY created_at DESC
    `,
    [scopedFarmId]
  );
  return result.rows;
}

async function createPost(auth, payload) {
  const farmId = resolveFarm(auth, payload.farmId);
  let image = null;

  if (payload.file) {
    image = await uploadImage({ file: payload.file, folder: `education/${farmId}` });
  }

  const result = await query(
    `
      INSERT INTO education_posts (farm_id, title, body, image_url, storage_key, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [farmId, payload.title, payload.body, image ? image.url : null, image ? image.key : null, auth.sub]
  );

  return result.rows[0];
}

module.exports = {
  createPost,
  listPosts
};

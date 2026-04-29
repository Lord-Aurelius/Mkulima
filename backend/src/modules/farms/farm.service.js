const { query, withTransaction } = require("../../config/db");
const AppError = require("../../lib/app-error");
const { getDefaultPackage } = require("../../services/package.service");
const { createAdminForFarm } = require("../auth/auth.service");

async function listFarms(auth) {
  if (auth.role === "creator") {
    const result = await query(
      `
        SELECT f.id, f.name, f.location, f.land_size, f.created_at,
               a.id AS admin_id, a.name AS admin_name, a.email AS admin_email,
               COALESCE(p.id, fp.id) AS package_id,
               COALESCE(p.name, fp.name) AS package_name,
               COALESCE(p.slug, fp.slug) AS package_slug
        FROM farms f
        LEFT JOIN users a ON a.farm_id = f.id AND a.role = 'admin'
        LEFT JOIN packages fp ON fp.slug = 'free'
        LEFT JOIN packages p ON p.id = f.package_id
        ORDER BY f.created_at DESC
      `
    );
    return result.rows;
  }

  const result = await query(
    `
      SELECT f.id, f.name, f.location, f.land_size, f.created_at,
             a.id AS admin_id, a.name AS admin_name, a.email AS admin_email
      FROM farms f
      LEFT JOIN users a ON a.farm_id = f.id AND a.role = 'admin'
      WHERE f.id = $1
      LIMIT 1
    `,
    [auth.farmId]
  );
  return result.rows;
}

async function getFarmById(id, auth) {
  const params = [id];
  let whereSql = "WHERE f.id = $1";
  if (auth.role !== "creator") {
    params.push(auth.farmId);
    whereSql += " AND f.id = $2";
  }

  const result = await query(
    `
      SELECT f.id, f.name, f.location, f.land_size, f.created_at, f.updated_at,
             a.id AS admin_id, a.name AS admin_name, a.email AS admin_email
      FROM farms f
      LEFT JOIN users a ON a.farm_id = f.id AND a.role = 'admin'
      ${whereSql}
      LIMIT 1
    `,
    params
  );

  if (!result.rowCount) {
    throw new AppError(404, "Farm not found.");
  }

  return result.rows[0];
}

async function createFarm({ name, location, landSize, admin }) {
  return withTransaction(async (client) => {
    const freePackage = await getDefaultPackage();
    const farmResult = await client.query(
      `
        INSERT INTO farms (name, location, land_size, package_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [name, location, landSize, freePackage?.id || null]
    );

    const farm = farmResult.rows[0];
    let adminRecord = null;

    if (admin) {
      adminRecord = await createAdminForFarm(
        {
          farmId: farm.id,
          name: admin.name,
          email: admin.email,
          password: admin.password
        },
        client
      );
    }

    return {
      ...farm,
      admin: adminRecord
    };
  });
}

async function updateFarm(id, { name, location, landSize }) {
  const result = await query(
    `
      UPDATE farms
      SET name = $2, location = $3, land_size = $4
      WHERE id = $1
      RETURNING *
    `,
    [id, name, location, landSize]
  );

  if (!result.rowCount) {
    throw new AppError(404, "Farm not found.");
  }

  return result.rows[0];
}

async function deleteFarm(id) {
  const result = await query("DELETE FROM farms WHERE id = $1 RETURNING id", [id]);
  if (!result.rowCount) {
    throw new AppError(404, "Farm not found.");
  }
  return { success: true };
}

async function clearFarmRecords(id) {
  return withTransaction(async (client) => {
    await client.query("DELETE FROM marketplace_ads WHERE farm_id = $1", [id]);
    await client.query("DELETE FROM education_posts WHERE farm_id = $1", [id]);
    await client.query("DELETE FROM livestock_updates WHERE farm_id = $1", [id]);
    await client.query("DELETE FROM livestock WHERE farm_id = $1", [id]);
    await client.query("DELETE FROM crops WHERE farm_id = $1", [id]);
    await client.query("DELETE FROM daily_logs WHERE farm_id = $1", [id]);
    await client.query("DELETE FROM worker_assignments WHERE farm_id = $1", [id]);
    await client.query("DELETE FROM users WHERE farm_id = $1 AND role = 'worker'", [id]);
    return { success: true };
  });
}

async function assignAdmin(id, adminId) {
  return withTransaction(async (client) => {
    const farmExists = await client.query("SELECT id FROM farms WHERE id = $1 LIMIT 1", [id]);
    if (!farmExists.rowCount) {
      throw new AppError(404, "Farm not found.");
    }

    const adminResult = await client.query(
      `
        UPDATE users
        SET farm_id = $2
        WHERE id = $1 AND role = 'admin'
        RETURNING id, role, name, email, farm_id
      `,
      [adminId, id]
    );

    if (!adminResult.rowCount) {
      throw new AppError(404, "Admin not found.");
    }

    return adminResult.rows[0];
  });
}

module.exports = {
  assignAdmin,
  clearFarmRecords,
  createFarm,
  deleteFarm,
  getFarmById,
  listFarms,
  updateFarm
};

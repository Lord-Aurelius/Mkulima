const { query } = require("../../config/db");
const AppError = require("../../lib/app-error");
const { ensureDefaultPackages } = require("../../services/package.service");

async function listPackages() {
  await ensureDefaultPackages();
  const result = await query(
    `
      SELECT id, name, slug, price_monthly, has_marketplace, description, created_at
      FROM packages
      ORDER BY price_monthly ASC, created_at ASC
    `
  );
  return result.rows;
}

async function createPackage(payload) {
  const result = await query(
    `
      INSERT INTO packages (name, slug, price_monthly, has_marketplace, description)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [payload.name, payload.slug, payload.priceMonthly, payload.hasMarketplace, payload.description]
  );
  return result.rows[0];
}

async function assignPackageToFarm(farmId, packageId) {
  const result = await query(
    `
      UPDATE farms
      SET package_id = $2
      WHERE id = $1
      RETURNING id, name, package_id
    `,
    [farmId, packageId]
  );

  if (!result.rowCount) {
    throw new AppError(404, "Farm not found.");
  }

  return result.rows[0];
}

module.exports = {
  assignPackageToFarm,
  createPackage,
  listPackages
};

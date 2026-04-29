const { query } = require("../config/db");

async function ensureDefaultPackages() {
  await query(
    `
      INSERT INTO packages (name, slug, price_monthly, has_marketplace, description)
      VALUES
        ('Free Plan', 'free', 0, FALSE, 'Core farm management tools.'),
        ('Premium Package', 'premium', 49, TRUE, 'Marketplace access for farms and workers.')
      ON CONFLICT (slug) DO UPDATE
      SET name = EXCLUDED.name,
          price_monthly = EXCLUDED.price_monthly,
          has_marketplace = EXCLUDED.has_marketplace,
          description = EXCLUDED.description
    `
  );
}

async function getDefaultPackage() {
  await ensureDefaultPackages();
  const result = await query(
    `
      SELECT id, name, slug, price_monthly, has_marketplace, description, created_at
      FROM packages
      WHERE slug = 'free'
      LIMIT 1
    `
  );

  return result.rows[0] || null;
}

async function getPackageForFarm(farmId) {
  await ensureDefaultPackages();
  const result = await query(
    `
      SELECT p.id, p.name, p.slug, p.price_monthly, p.has_marketplace, p.description, p.created_at
      FROM farms f
      LEFT JOIN packages p ON p.id = f.package_id
      WHERE f.id = $1
      LIMIT 1
    `,
    [farmId]
  );

  if (!result.rowCount) {
    return null;
  }

  return result.rows[0]?.id ? result.rows[0] : getDefaultPackage();
}

module.exports = {
  ensureDefaultPackages,
  getDefaultPackage,
  getPackageForFarm
};

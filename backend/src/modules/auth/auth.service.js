const crypto = require("crypto");
const { query, withTransaction } = require("../../config/db");
const AppError = require("../../lib/app-error");
const { getDefaultPackage, getPackageForFarm } = require("../../services/package.service");
const { signAccessToken } = require("../../services/token.service");
const { comparePassword, hashPassword } = require("../../utils/password");
const { cleanEmail, cleanString } = require("../../utils/sanitize");

async function bootstrapCreator({ name, email, password }) {
  const existing = await query("SELECT id FROM users WHERE role = 'creator' LIMIT 1");
  if (existing.rowCount > 0) {
    throw new AppError(409, "Creator account already exists.");
  }

  const passwordHash = await hashPassword(password);
  const result = await query(
    `
      INSERT INTO users (role, name, email, password_hash)
      VALUES ('creator', $1, $2, $3)
      RETURNING id, role, name, email, farm_id, created_at
    `,
    [cleanString(name, 160), cleanEmail(email), passwordHash]
  );

  const user = result.rows[0];
  return {
    token: signAccessToken(user),
    user
  };
}

async function createSignupRequest({ name, email, password, farmName, location, landSize }) {
  const normalizedEmail = cleanEmail(email);
  const existingUser = await query("SELECT id FROM users WHERE email = $1 LIMIT 1", [normalizedEmail]);
  if (existingUser.rowCount) {
    throw new AppError(409, "An account with this email already exists.");
  }

  const existingRequest = await query(
    "SELECT id FROM signup_requests WHERE requested_email = $1 AND status = 'pending' LIMIT 1",
    [normalizedEmail]
  );
  if (existingRequest.rowCount) {
    throw new AppError(409, "A signup request for this email is already pending.");
  }

  const passwordHash = await hashPassword(password);
  const result = await query(
    `
      INSERT INTO signup_requests (
        requested_name, requested_email, password_hash,
        requested_farm_name, requested_location, requested_land_size
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, requested_name, requested_email, requested_farm_name, requested_location, requested_land_size, status, created_at
    `,
    [
      cleanString(name, 160),
      normalizedEmail,
      passwordHash,
      cleanString(farmName, 160),
      cleanString(location, 255),
      landSize
    ]
  );

  return result.rows[0];
}

async function listSignupRequests() {
  const result = await query(
    `
      SELECT id, requested_name, requested_email, requested_farm_name,
             requested_location, requested_land_size, status, created_at
      FROM signup_requests
      WHERE status = 'pending'
      ORDER BY created_at DESC
    `
  );

  return result.rows;
}

async function approveSignupRequest(requestId) {
  return withTransaction(async (client) => {
    const requestResult = await client.query(
      `
        SELECT *
        FROM signup_requests
        WHERE id = $1 AND status = 'pending'
        LIMIT 1
      `,
      [requestId]
    );

    if (!requestResult.rowCount) {
      throw new AppError(404, "Signup request not found.");
    }

    const signupRequest = requestResult.rows[0];

    const freePackage = await getDefaultPackage();
    const farmResult = await client.query(
      `
        INSERT INTO farms (name, location, land_size, package_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
      [
        signupRequest.requested_farm_name,
        signupRequest.requested_location,
        signupRequest.requested_land_size,
        freePackage?.id || null
      ]
    );

    const farm = farmResult.rows[0];

    const adminResult = await client.query(
      `
        INSERT INTO users (role, farm_id, name, email, password_hash, qr_token)
        VALUES ('admin', $1, $2, $3, $4, $5)
        RETURNING id, role, name, email, farm_id
      `,
      [
        farm.id,
        signupRequest.requested_name,
        signupRequest.requested_email,
        signupRequest.password_hash,
        crypto.randomUUID()
      ]
    );

    await client.query(
      `
        UPDATE signup_requests
        SET status = 'approved', reviewed_at = NOW()
        WHERE id = $1
      `,
      [requestId]
    );

    return {
      farm,
      admin: adminResult.rows[0]
    };
  });
}

async function rejectSignupRequest(requestId) {
  const result = await query(
    `
      UPDATE signup_requests
      SET status = 'rejected', reviewed_at = NOW()
      WHERE id = $1 AND status = 'pending'
      RETURNING id
    `,
    [requestId]
  );

  if (!result.rowCount) {
    throw new AppError(404, "Signup request not found.");
  }

  return { success: true };
}

async function login({ email, password }) {
  const result = await query(
    `
      SELECT u.id, u.role, u.name, u.email, u.password_hash, u.farm_id, f.name AS farm_name, f.logo_url AS farm_logo_url
      FROM users u
      LEFT JOIN farms f ON f.id = u.farm_id
      WHERE u.email = $1 AND u.is_active = TRUE
      LIMIT 1
    `,
    [cleanEmail(email)]
  );

  if (!result.rowCount) {
    throw new AppError(401, "Invalid credentials.");
  }

  const user = result.rows[0];
  const valid = await comparePassword(password, user.password_hash);
  if (!valid) {
    throw new AppError(401, "Invalid credentials.");
  }

  const farmPackage = user.farm_id ? await getPackageForFarm(user.farm_id) : null;
  return {
    token: signAccessToken(user),
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      farmId: user.farm_id,
      farmName: user.farm_name,
      farmLogoUrl: user.farm_logo_url,
      packageName: farmPackage?.name || null,
      hasMarketplace: Boolean(farmPackage?.has_marketplace)
    }
  };
}

async function loginWithQr({ qrToken }) {
  const result = await query(
    `
      SELECT u.id, u.role, u.name, u.email, u.farm_id, f.name AS farm_name, f.logo_url AS farm_logo_url
      FROM users u
      LEFT JOIN farms f ON f.id = u.farm_id
      WHERE u.qr_token = $1 AND u.role = 'worker' AND u.is_active = TRUE
      LIMIT 1
    `,
    [qrToken]
  );

  if (!result.rowCount) {
    throw new AppError(401, "Invalid QR code.");
  }

  const user = result.rows[0];
  const farmPackage = user.farm_id ? await getPackageForFarm(user.farm_id) : null;
  return {
    token: signAccessToken(user),
    user: {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      farmId: user.farm_id,
      farmName: user.farm_name,
      farmLogoUrl: user.farm_logo_url,
      packageName: farmPackage?.name || null,
      hasMarketplace: Boolean(farmPackage?.has_marketplace)
    }
  };
}

async function getCurrentUser(userId) {
  const result = await query(
    `
      SELECT u.id, u.role, u.name, u.email, u.farm_id, u.duty, f.name AS farm_name, f.logo_url AS farm_logo_url
      FROM users u
      LEFT JOIN farms f ON f.id = u.farm_id
      WHERE u.id = $1 AND u.is_active = TRUE
      LIMIT 1
    `,
    [userId]
  );

  if (!result.rowCount) {
    throw new AppError(404, "User not found.");
  }

  const user = result.rows[0];
  const farmPackage = user.farm_id ? await getPackageForFarm(user.farm_id) : null;
  return {
    ...user,
    farm_logo_url: user.farm_logo_url,
    package_name: farmPackage?.name || null,
    has_marketplace: Boolean(farmPackage?.has_marketplace)
  };
}

async function changePassword(userId, currentPassword, newPassword) {
  const result = await query(
    `
      SELECT id, password_hash
      FROM users
      WHERE id = $1 AND role IN ('creator', 'admin')
      LIMIT 1
    `,
    [userId]
  );

  if (!result.rowCount) {
    throw new AppError(404, "Account not found.");
  }

  const valid = await comparePassword(currentPassword, result.rows[0].password_hash);
  if (!valid) {
    throw new AppError(401, "Current password is incorrect.");
  }

  const passwordHash = await hashPassword(newPassword);
  await query("UPDATE users SET password_hash = $2 WHERE id = $1", [userId, passwordHash]);
  return { success: true };
}

module.exports = {
  approveSignupRequest,
  bootstrapCreator,
  changePassword,
  createSignupRequest,
  getCurrentUser,
  listSignupRequests,
  login,
  loginWithQr,
  rejectSignupRequest
};

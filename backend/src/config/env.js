const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

function requireEnv(name, fallback) {
  const value = process.env[name] || fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const localAppOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
  "http://127.0.0.1:5173"
];

const configuredAppOrigins = (process.env.APP_ORIGIN || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const defaultLocalAppUrl = "http://127.0.0.1:4173";
const configuredPrimaryAppOrigin = configuredAppOrigins[0] || "";

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  appOrigins: [
    ...new Set(
      envModeUsesLocalOrigins(process.env.NODE_ENV || "development")
        ? [...configuredAppOrigins, ...localAppOrigins]
        : configuredAppOrigins
    )
  ],
  publicAssetBaseUrl: process.env.PUBLIC_ASSET_BASE_URL || (
    envModeUsesLocalOrigins(process.env.NODE_ENV || "development")
      ? "http://127.0.0.1:4000"
      : ""
  ),
  publicAppUrl: process.env.PUBLIC_APP_URL || (
    configuredPrimaryAppOrigin || (
      envModeUsesLocalOrigins(process.env.NODE_ENV || "development")
        ? defaultLocalAppUrl
        : ""
    )
  ),
  jwtSecret: requireEnv("JWT_SECRET", "change-this-secret"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  databaseUrl: requireEnv("DATABASE_URL"),
  dbPoolMax: Number(process.env.DB_POOL_MAX || 10),
  dbQueryTimeoutMs: Number(process.env.DB_QUERY_TIMEOUT_MS || 15000),
  logRequests: process.env.LOG_REQUESTS
    ? process.env.LOG_REQUESTS === "true"
    : envModeUsesLocalOrigins(process.env.NODE_ENV || "development"),
  maxImageSizeMb: Number(process.env.MAX_IMAGE_SIZE_MB || 4),
  s3: {
    region: requireEnv("S3_REGION", "us-east-1"),
    bucket: requireEnv("S3_BUCKET"),
    endpoint: requireEnv("S3_ENDPOINT"),
    accessKeyId: requireEnv("S3_ACCESS_KEY"),
    secretAccessKey: requireEnv("S3_SECRET_KEY"),
    publicBaseUrl: requireEnv("S3_PUBLIC_BASE_URL")
  }
};

function envModeUsesLocalOrigins(nodeEnv) {
  return !nodeEnv || nodeEnv === "development";
}

module.exports = env;

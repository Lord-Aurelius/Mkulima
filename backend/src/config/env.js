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

const defaultAppOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
  "http://127.0.0.1:5173"
];

const configuredAppOrigins = (process.env.APP_ORIGIN || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  appOrigins: [...new Set([...configuredAppOrigins, ...defaultAppOrigins])],
  publicAssetBaseUrl: process.env.PUBLIC_ASSET_BASE_URL || "http://127.0.0.1:4000",
  jwtSecret: requireEnv("JWT_SECRET", "change-this-secret"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  databaseUrl: requireEnv("DATABASE_URL"),
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

module.exports = env;

const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { query } = require("../config/db");
const env = require("../config/env");
const s3 = require("../config/s3");

function useLocalStorage() {
  return (
    env.nodeEnv === "development" &&
    (env.s3.endpoint.includes("example.com") ||
      env.s3.accessKeyId === "replace-me" ||
      env.s3.secretAccessKey === "replace-me")
  );
}

function useDatabaseStorage() {
  return (
    env.s3.endpoint.includes("example.com") ||
    env.s3.accessKeyId === "replace-me" ||
    env.s3.secretAccessKey === "replace-me" ||
    env.s3.publicBaseUrl.includes("example.com")
  );
}

function publicAssetUrl(key) {
  return `${env.publicAssetBaseUrl.replace(/\/$/, "")}/assets/${key}`;
}

async function uploadImage({ file, folder }) {
  const key = `${folder}/${Date.now()}-${crypto.randomUUID()}.webp`;
  const buffer = await sharp(file.buffer)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();

  if (useDatabaseStorage()) {
    await query(
      `
        INSERT INTO uploaded_assets (storage_key, content_type, image_data)
        VALUES ($1, $2, $3)
        ON CONFLICT (storage_key)
        DO UPDATE SET content_type = EXCLUDED.content_type, image_data = EXCLUDED.image_data
      `,
      [key, "image/webp", buffer]
    );

    return {
      key,
      url: publicAssetUrl(key),
      filename: path.basename(key)
    };
  }

  if (useLocalStorage()) {
    const uploadRoot = path.join(__dirname, "..", "..", "uploads");
    const absoluteFile = path.join(uploadRoot, key);
    await fs.mkdir(path.dirname(absoluteFile), { recursive: true });
    await fs.writeFile(absoluteFile, buffer);

    return {
      key,
      url: `${env.publicAssetBaseUrl.replace(/\/$/, "")}/uploads/${key}`,
      filename: path.basename(key)
    };
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: env.s3.bucket,
      Key: key,
      Body: buffer,
      ContentType: "image/webp"
    })
  );

  return {
    key,
    url: `${env.s3.publicBaseUrl.replace(/\/$/, "")}/${key}`,
    filename: path.basename(key)
  };
}

async function getStoredAsset(key) {
  const result = await query(
    `
      SELECT storage_key, content_type, image_data
      FROM uploaded_assets
      WHERE storage_key = $1
      LIMIT 1
    `,
    [key]
  );

  return result.rows[0] || null;
}

module.exports = {
  getStoredAsset,
  uploadImage
};

const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
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

async function uploadImage({ file, folder }) {
  const key = `${folder}/${Date.now()}-${crypto.randomUUID()}.webp`;
  const buffer = await sharp(file.buffer)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();

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

module.exports = {
  uploadImage
};

const fs = require("fs/promises");
const path = require("path");
const { pool, query } = require("../src/config/db");
const env = require("../src/config/env");

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(absolutePath));
    } else {
      files.push(absolutePath);
    }
  }

  return files;
}

async function updateLocalhostUrls(baseUrl) {
  const tables = ["crops", "livestock", "education_posts", "marketplace_ads"];

  for (const table of tables) {
    await query(
      `
        UPDATE ${table}
        SET image_url = REPLACE(image_url, 'http://127.0.0.1:4000', $1)
        WHERE image_url LIKE 'http://127.0.0.1:4000/%'
      `,
      [baseUrl]
    );
  }

  await query(
    `
      UPDATE daily_log_images
      SET image_url = REPLACE(image_url, 'http://127.0.0.1:4000', $1)
      WHERE image_url LIKE 'http://127.0.0.1:4000/%'
    `,
    [baseUrl]
  );
}

async function main() {
  const uploadRoot = path.join(__dirname, "..", "uploads");
  const files = await walk(uploadRoot);

  for (const file of files) {
    const key = path.relative(uploadRoot, file).replace(/\\/g, "/");
    const imageData = await fs.readFile(file);
    await query(
      `
        INSERT INTO uploaded_assets (storage_key, content_type, image_data)
        VALUES ($1, $2, $3)
        ON CONFLICT (storage_key)
        DO UPDATE SET content_type = EXCLUDED.content_type, image_data = EXCLUDED.image_data
      `,
      [key, "image/webp", imageData]
    );
  }

  await updateLocalhostUrls(env.publicAssetBaseUrl.replace(/\/$/, ""));
  console.log(`Imported ${files.length} local upload(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

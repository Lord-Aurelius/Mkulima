const { Pool } = require("pg");
const env = require("./env");

const shouldUseSsl = /sslmode=require/i.test(env.databaseUrl) || /neon\.tech/i.test(env.databaseUrl);

const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: shouldUseSsl
    ? {
        rejectUnauthorized: false
      }
    : false
});

pool.on("error", (error) => {
  console.error("PostgreSQL pool error", error);
});

async function query(text, params) {
  return pool.query(text, params);
}

async function withTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query,
  withTransaction
};

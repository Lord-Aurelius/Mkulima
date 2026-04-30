const app = require("./app");
const { ensureSchema } = require("./config/db");
const env = require("./config/env");
const logger = require("./lib/logger");

async function start() {
  try {
    await ensureSchema();
    app.listen(env.port, () => {
      logger.info("server_started", { port: env.port, env: env.nodeEnv });
    });
  } catch (error) {
    logger.error("server_start_failed", {
      message: error.message
    });
    process.exit(1);
  }
}

start();

const app = require("./app");
const env = require("./config/env");
const logger = require("./lib/logger");

app.listen(env.port, () => {
  logger.info("server_started", { port: env.port, env: env.nodeEnv });
});

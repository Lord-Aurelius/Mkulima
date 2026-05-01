const express = require("express");
const path = require("path");
const env = require("./config/env");
const logger = require("./lib/logger");
const errorHandler = require("./middleware/error-handler");
const notFound = require("./middleware/not-found");
const securityHeaders = require("./middleware/security-headers");
const serveDatabaseAsset = require("./middleware/asset-server");
const authRoutes = require("./modules/auth/auth.routes");
const farmRoutes = require("./modules/farms/farm.routes");
const workerRoutes = require("./modules/workers/worker.routes");
const logRoutes = require("./modules/logs/log.routes");
const cropRoutes = require("./modules/crops/crop.routes");
const livestockRoutes = require("./modules/livestock/livestock.routes");
const educationRoutes = require("./modules/education/education.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");
const packageRoutes = require("./modules/packages/package.routes");
const marketplaceRoutes = require("./modules/marketplace/marketplace.routes");
const financeRoutes = require("./modules/finance/finance.routes");

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(securityHeaders);

app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;
  const isAllowedOrigin = requestOrigin && env.appOrigins.includes(requestOrigin);

  if (requestOrigin && !isAllowedOrigin) {
    return res.status(403).json({ error: { message: "Origin not allowed." } });
  }

  if (isAllowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", requestOrigin);
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Vary", "Origin");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  return next();
});

app.use(express.json({ limit: "1mb" }));
app.get("/assets/*", serveDatabaseAsset);
app.get("/uploads/*", serveDatabaseAsset);
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads"), {
  immutable: true,
  maxAge: "7d"
}));

app.use((req, _res, next) => {
  if (env.logRequests && req.path !== "/health") {
    logger.info("request", { method: req.method, path: req.originalUrl });
  }
  next();
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/auth", authRoutes);
app.use("/farms", farmRoutes);
app.use("/workers", workerRoutes);
app.use("/logs", logRoutes);
app.use("/crops", cropRoutes);
app.use("/livestock", livestockRoutes);
app.use("/education", educationRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/packages", packageRoutes);
app.use("/marketplace", marketplaceRoutes);
app.use("/finance", financeRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

const express = require("express");
const path = require("path");
const env = require("./config/env");
const logger = require("./lib/logger");
const errorHandler = require("./middleware/error-handler");
const notFound = require("./middleware/not-found");
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

app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;
  const allowedOrigin = requestOrigin && env.appOrigins.includes(requestOrigin)
    ? requestOrigin
    : env.appOrigins[0];

  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  res.setHeader("Vary", "Origin");
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  return next();
});

app.use(express.json({ limit: "1mb" }));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use((req, _res, next) => {
  logger.info("request", { method: req.method, path: req.originalUrl });
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

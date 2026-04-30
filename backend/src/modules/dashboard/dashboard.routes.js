const express = require("express");
const { requireAuth, requireRoles } = require("../../middleware/auth");
const controller = require("./dashboard.controller");

const router = express.Router();

router.use(requireAuth);
router.get("/summary", requireRoles("creator", "admin", "worker"), controller.getSummary);
router.get("/monthly-report", requireRoles("creator", "admin"), controller.getMonthlyReport);
router.get("/worker-contribution", requireRoles("worker"), controller.getWorkerContribution);

module.exports = router;

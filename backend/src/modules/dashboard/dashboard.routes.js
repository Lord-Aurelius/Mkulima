const express = require("express");
const { requireAuth, requireRoles } = require("../../middleware/auth");
const controller = require("./dashboard.controller");

const router = express.Router();

router.use(requireAuth);
router.get("/summary", requireRoles("creator", "admin"), controller.getSummary);

module.exports = router;

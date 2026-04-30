const express = require("express");
const { requireAuth, requireRoles } = require("../../middleware/auth");
const controller = require("./finance.controller");

const router = express.Router();

router.use(requireAuth);
router.get("/", requireRoles("admin"), controller.listEntries);
router.post("/", requireRoles("admin"), controller.createEntry);

module.exports = router;

const express = require("express");
const { requireAuth, requireRoles } = require("../../middleware/auth");
const upload = require("../../middleware/upload");
const controller = require("./log.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/", requireRoles("creator", "admin", "worker"), controller.listLogs);
router.post("/", requireRoles("creator", "admin", "worker"), upload.array("images", 4), controller.createLog);

module.exports = router;

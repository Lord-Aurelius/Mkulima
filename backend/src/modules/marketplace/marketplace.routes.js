const express = require("express");
const { requireAuth, requireRoles } = require("../../middleware/auth");
const upload = require("../../middleware/upload");
const controller = require("./marketplace.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/", requireRoles("creator", "admin", "worker"), controller.listAds);
router.post("/", requireRoles("creator", "admin"), upload.single("image"), controller.createAd);

module.exports = router;

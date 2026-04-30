const express = require("express");
const { requireAuth, requireRoles } = require("../../middleware/auth");
const upload = require("../../middleware/upload");
const controller = require("./crop.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/", requireRoles("creator", "admin", "worker"), controller.listCrops);
router.post("/", requireRoles("creator", "admin"), upload.single("image"), controller.createCrop);
router.patch("/:id", requireRoles("creator", "admin"), upload.single("image"), controller.updateCrop);
router.post("/:id/regenerate-qr", requireRoles("creator", "admin"), controller.regenerateCropQr);
router.delete("/:id", requireRoles("creator", "admin"), controller.deleteCrop);

module.exports = router;

const express = require("express");
const { requireAuth, requireRoles } = require("../../middleware/auth");
const upload = require("../../middleware/upload");
const controller = require("./livestock.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/", requireRoles("creator", "admin", "worker"), controller.listLivestock);
router.post("/", requireRoles("creator", "admin"), upload.single("image"), controller.createLivestock);
router.patch("/:id", requireRoles("creator", "admin"), upload.single("image"), controller.updateLivestock);
router.post("/:id/regenerate-qr", requireRoles("creator", "admin"), controller.regenerateLivestockQr);
router.delete("/:id", requireRoles("creator", "admin"), controller.deleteLivestock);
router.get("/:id/updates", requireRoles("creator", "admin", "worker"), controller.listProductionUpdates);
router.post("/:id/updates", requireRoles("creator", "admin", "worker"), controller.addProductionUpdate);

module.exports = router;

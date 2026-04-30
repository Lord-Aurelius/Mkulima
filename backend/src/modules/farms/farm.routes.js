const express = require("express");
const { requireAuth, requireRoles } = require("../../middleware/auth");
const upload = require("../../middleware/upload");
const controller = require("./farm.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/", requireRoles("creator", "admin"), controller.listFarms);
router.get("/:id", requireRoles("creator", "admin"), controller.getFarm);
router.post("/", requireRoles("creator"), upload.single("logo"), controller.createFarm);
router.patch("/:id", requireRoles("creator"), upload.single("logo"), controller.updateFarm);
router.patch("/:id/assign-admin", requireRoles("creator"), controller.assignAdmin);
router.delete("/:id/records", requireRoles("creator"), controller.clearFarmRecords);
router.delete("/:id", requireRoles("creator"), controller.deleteFarm);

module.exports = router;

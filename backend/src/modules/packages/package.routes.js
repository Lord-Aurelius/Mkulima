const express = require("express");
const { requireAuth, requireRoles } = require("../../middleware/auth");
const controller = require("./package.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/", requireRoles("creator"), controller.listPackages);
router.post("/", requireRoles("creator"), controller.createPackage);
router.patch("/farms/:farmId", requireRoles("creator"), controller.assignPackageToFarm);

module.exports = router;

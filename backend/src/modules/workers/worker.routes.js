const express = require("express");
const { requireAuth, requireRoles } = require("../../middleware/auth");
const controller = require("./worker.controller");

const router = express.Router();

router.use(requireAuth);

router.get("/assignments/all", requireRoles("creator", "admin"), controller.listFarmAssignments);
router.get("/", requireRoles("creator", "admin"), controller.listWorkers);
router.post("/", requireRoles("creator", "admin"), controller.createWorker);
router.get("/me/assignments", requireRoles("worker"), controller.listAssignments);
router.get("/:id", requireRoles("creator", "admin"), controller.getWorker);
router.patch("/:id", requireRoles("creator", "admin"), controller.updateWorker);
router.get("/:id/assignments", requireRoles("creator", "admin"), controller.listAssignments);
router.post("/:id/assignments", requireRoles("creator", "admin"), controller.createAssignment);
router.patch("/:id/assignments/:assignmentId", requireRoles("creator", "admin"), controller.updateAssignmentStatus);

module.exports = router;

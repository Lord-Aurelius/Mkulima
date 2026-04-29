const express = require("express");
const { requireAuth, requireRoles } = require("../../middleware/auth");
const controller = require("./auth.controller");

const router = express.Router();

router.post("/bootstrap", controller.bootstrap);
router.post("/login", controller.login);
router.post("/signup-request", controller.signupRequest);
router.get("/me", requireAuth, controller.me);
router.post("/change-password", requireAuth, requireRoles("creator", "admin"), controller.changePassword);
router.get("/signup-requests", requireAuth, requireRoles("creator"), controller.listSignupRequests);
router.post("/signup-requests/:id/approve", requireAuth, requireRoles("creator"), controller.approveSignupRequest);
router.post("/signup-requests/:id/reject", requireAuth, requireRoles("creator"), controller.rejectSignupRequest);

module.exports = router;

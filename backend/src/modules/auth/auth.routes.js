const express = require("express");
const { requireAuth, requireRoles } = require("../../middleware/auth");
const { createRateLimiter } = require("../../middleware/rate-limit");
const controller = require("./auth.controller");

const router = express.Router();
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyPrefix: "auth"
});

router.post("/bootstrap", authLimiter, controller.bootstrap);
router.post("/login", authLimiter, controller.login);
router.post("/signup-request", authLimiter, controller.signupRequest);
router.get("/me", requireAuth, controller.me);
router.post("/change-password", requireAuth, requireRoles("creator", "admin"), controller.changePassword);
router.get("/signup-requests", requireAuth, requireRoles("creator"), controller.listSignupRequests);
router.post("/signup-requests/:id/approve", requireAuth, requireRoles("creator"), controller.approveSignupRequest);
router.post("/signup-requests/:id/reject", requireAuth, requireRoles("creator"), controller.rejectSignupRequest);

module.exports = router;

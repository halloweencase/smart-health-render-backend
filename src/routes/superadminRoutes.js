const express = require("express");
const router = express.Router();
const {
  createHospital,
  getHospitals,
  updateHospital,
  deleteHospital,
  createHospitalAdmin,
  getStatistics,
  getUsersByRole,
  deleteUser,
  resetAdminPassword,
} = require("../controllers/superadminController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

// All superadmin routes require SUPER_ADMIN role
router.use(requireAuth);
router.use(requireRole(["SUPER_ADMIN"]));

router.post("/hospitals", createHospital);
router.get("/hospitals", getHospitals);
router.put("/hospitals/:id", updateHospital);
router.delete("/hospitals/:id", deleteHospital);
router.post("/hospital-admin", createHospitalAdmin);
router.post("/hospital-admin/reset-password", resetAdminPassword);
router.get("/statistics", getStatistics);
router.get("/users", getUsersByRole);
router.delete("/users/:id", deleteUser);

module.exports = router;

const express = require("express");
const router = express.Router();
const {
  getOwnReports,
  getOwnPrescriptions,
  getOwnAppointments,
  getOwnMetrics,
  getOwnVisits,
} = require("../controllers/patientController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

// All patient routes require PATIENT role
router.use(requireAuth);
router.use(requireRole(["PATIENT"]));

router.get("/reports", getOwnReports);
router.get("/prescriptions", getOwnPrescriptions);
router.get("/appointments", getOwnAppointments);
router.get("/metrics", getOwnMetrics);
router.get("/visits", getOwnVisits);

module.exports = router;

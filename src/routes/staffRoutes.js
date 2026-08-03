const express = require("express");
const router = express.Router();
const {
  getPatients,
  registerPatient,
  updatePatient,
  uploadReport,
  createAppointment,
  getAppointments,
  updateAppointment,
  getDoctors,
} = require("../controllers/staffController");
const { requireAuth, requireRole, authorizeHospitalAccess } = require("../middleware/authMiddleware");

// All staff routes require STAFF role
router.use(requireAuth);
router.use(requireRole(["STAFF"]));

router.get("/patients", getPatients);
router.get("/doctors", getDoctors);
router.post("/patient", registerPatient);
router.put("/patient/:id", authorizeHospitalAccess, updatePatient);
router.post("/report", uploadReport);

router.post("/appointments", createAppointment);
router.get("/appointments", getAppointments);
router.put("/appointments/:id", updateAppointment);

module.exports = router;

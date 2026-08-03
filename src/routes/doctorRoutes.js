const express = require("express");
const router = express.Router();
const {
  getPatients,
  getPatientDetails,
  uploadReport,
  addPrescription,
  updateHealthMetrics,
  registerPatient,
} = require("../controllers/doctorController");
const { requireAuth, requireRole, authorizeHospitalAccess } = require("../middleware/authMiddleware");

// All doctor routes require DOCTOR role
router.use(requireAuth);
router.use(requireRole(["DOCTOR"]));

router.get("/patients", getPatients);
router.post("/patient", registerPatient);
router.get("/patient/:id", authorizeHospitalAccess, getPatientDetails);
router.post("/report", uploadReport);
router.put("/prescription", addPrescription);
router.put("/metrics", updateHealthMetrics);

module.exports = router;

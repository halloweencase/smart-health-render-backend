const express = require("express");
const router = express.Router();
const {
  updateHospitalInfo,
  getHospitalProfile,
  createDoctor,
  createStaff,
  createPatient,
  getUsers,
  updateUser,
  deleteUser,
  uploadPatientReport,
} = require("../controllers/adminController");
const { requireAuth, requireRole, authorizeHospitalAccess } = require("../middleware/authMiddleware");

// All routes require HOSPITAL_ADMIN role
router.use(requireAuth);
router.use(requireRole(["HOSPITAL_ADMIN"]));

router.get("/hospital", getHospitalProfile);
router.put("/hospital", updateHospitalInfo);

router.post("/doctors", createDoctor);
router.post("/staff", createStaff);
router.post("/patients", createPatient);

router.get("/users", getUsers);
router.post("/report", uploadPatientReport);
router.put("/users/:id", authorizeHospitalAccess, updateUser);
router.delete("/users/:id", authorizeHospitalAccess, deleteUser);

module.exports = router;

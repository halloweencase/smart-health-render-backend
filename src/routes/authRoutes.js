const express = require("express");
const router = express.Router();

const {
  register,
  login,
  me,
  updateProfile,
  changePassword,
  logout,
  getHospitalsList,
} = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.get("/hospitals", getHospitalsList);
router.get("/me", requireAuth, me);
router.put("/me", requireAuth, updateProfile);
router.put("/profile", requireAuth, updateProfile);
router.patch("/profile", requireAuth, updateProfile);
router.put("/change-password", requireAuth, changePassword);
router.post("/logout", requireAuth, logout);

module.exports = router;

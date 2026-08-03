const pool = require("../config/db");
const bcrypt = require("bcrypt");

// CREATE HOSPITAL
const createHospital = async (req, res) => {
  try {
    const {
      hospital_name,
      registration_number,
      email,
      phone,
      address,
      city,
      state,
      country,
      status,
    } = req.body;

    if (!hospital_name || !registration_number || !email || !phone || !address || !city || !state || !country) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Check unique registration number
    const [existing] = await pool.execute(
      "SELECT hospital_id FROM hospitals WHERE registration_number = ?",
      [registration_number]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Hospital registration number already exists",
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO hospitals (hospital_name, registration_number, email, phone, address, city, state, country, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        hospital_name,
        registration_number,
        email,
        phone,
        address,
        city,
        state,
        country,
        status || "active",
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Hospital created successfully",
      hospital_id: result.insertId,
    });
  } catch (error) {
    console.error("Error creating hospital:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// GET ALL HOSPITALS
const getHospitals = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM hospitals ORDER BY hospital_id DESC"
    );
    return res.json({
      success: true,
      hospitals: rows,
    });
  } catch (error) {
    console.error("Error getting hospitals:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// EDIT HOSPITAL DETAILS
const updateHospital = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      hospital_name,
      registration_number,
      email,
      phone,
      address,
      city,
      state,
      country,
      status,
    } = req.body;

    if (!hospital_name || !registration_number || !email || !phone || !address || !city || !state || !country) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Check unique registration except this one
    const [existing] = await pool.execute(
      "SELECT hospital_id FROM hospitals WHERE registration_number = ? AND hospital_id <> ?",
      [registration_number, id]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Hospital registration number already exists for another hospital",
      });
    }

    await pool.execute(
      `UPDATE hospitals 
       SET hospital_name = ?, registration_number = ?, email = ?, phone = ?, address = ?, city = ?, state = ?, country = ?, status = ?
       WHERE hospital_id = ?`,
      [
        hospital_name,
        registration_number,
        email,
        phone,
        address,
        city,
        state,
        country,
        status || "active",
        id,
      ]
    );

    return res.json({
      success: true,
      message: "Hospital details updated successfully",
    });
  } catch (error) {
    console.error("Error updating hospital:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// DELETE HOSPITAL
const deleteHospital = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete or cascade users linked to this hospital? Database constraint (fk_users_hospital ON DELETE SET NULL) handles this,
    // but the prompt says isolated data, so deleting the hospital is fine.
    await pool.execute("DELETE FROM hospitals WHERE hospital_id = ?", [id]);

    return res.json({
      success: true,
      message: "Hospital deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting hospital:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// CREATE HOSPITAL ADMIN
const createHospitalAdmin = async (req, res) => {
  try {
    const { full_name, email, phone, password, hospital_id } = req.body;

    if (!full_name || !email || !phone || !password || !hospital_id) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Check if hospital exists
    const [hospCheck] = await pool.execute(
      "SELECT hospital_id FROM hospitals WHERE hospital_id = ?",
      [hospital_id]
    );
    if (hospCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Hospital not found",
      });
    }

    // Enforce exactly one Admin per hospital
    const [adminCheck] = await pool.execute(
      "SELECT id FROM users WHERE role = 'HOSPITAL_ADMIN' AND hospital_id = ?",
      [hospital_id]
    );
    if (adminCheck.length > 0) {
      const existingAdminId = adminCheck[0].id;
      // Check if email is already taken by ANOTHER user
      const [emailCheck] = await pool.execute(
        "SELECT id FROM users WHERE email = ? AND id <> ?",
        [email, existingAdminId]
      );
      if (emailCheck.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Email is already registered by another user",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.execute(
        `UPDATE users 
         SET full_name = ?, email = ?, phone = ?, password = ?, status = 'active'
         WHERE id = ?`,
        [full_name, email.toLowerCase(), phone, hashedPassword, existingAdminId]
      );

      return res.json({
        success: true,
        message: "Hospital Administrator updated successfully",
      });
    }

    // Check unique email
    const [emailCheck] = await pool.execute(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    if (emailCheck.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email is already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(
      `INSERT INTO users (full_name, email, phone, password, role, hospital_id, status)
       VALUES (?, ?, ?, ?, 'HOSPITAL_ADMIN', ?, 'active')`,
      [full_name, email.toLowerCase(), phone, hashedPassword, hospital_id]
    );

    return res.status(201).json({
      success: true,
      message: "Hospital Administrator created successfully",
      user_id: result.insertId,
    });
  } catch (error) {
    console.error("Error creating hospital admin:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// GET STATISTICS
const getStatistics = async (req, res) => {
  try {
    const [hospCount] = await pool.execute("SELECT COUNT(*) AS total FROM hospitals");
    const [activeHosp] = await pool.execute("SELECT COUNT(*) AS total FROM hospitals WHERE status = 'active'");
    
    const [userRoles] = await pool.execute(
      "SELECT role, COUNT(*) AS count FROM users GROUP BY role"
    );

    const rolesMap = {
      SUPER_ADMIN: 0,
      HOSPITAL_ADMIN: 0,
      DOCTOR: 0,
      STAFF: 0,
      PATIENT: 0,
    };

    userRoles.forEach((item) => {
      if (rolesMap[item.role] !== undefined) {
        rolesMap[item.role] = item.count;
      }
    });

    return res.json({
      success: true,
      statistics: {
        total_hospitals: hospCount[0].total,
        active_hospitals: activeHosp[0].total,
        super_admins: rolesMap.SUPER_ADMIN,
        hospital_admins: rolesMap.HOSPITAL_ADMIN,
        doctors: rolesMap.DOCTOR,
        staff: rolesMap.STAFF,
        patients: rolesMap.PATIENT,
        total_users: Object.values(rolesMap).reduce((a, b) => a + b, 0),
      },
    });
  } catch (error) {
    console.error("Error getting statistics:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// RESET HOSPITAL ADMIN PASSWORD
const resetAdminPassword = async (req, res) => {
  try {
    const { hospital_id, new_password } = req.body;

    if (!hospital_id || !new_password) {
      return res.status(400).json({
        success: false,
        message: "Hospital ID and new password are required",
      });
    }

    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Find the HOSPITAL_ADMIN for this hospital
    const [admin] = await pool.execute(
      "SELECT id FROM users WHERE role = 'HOSPITAL_ADMIN' AND hospital_id = ?",
      [hospital_id]
    );

    if (admin.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No administrator assigned to this hospital yet",
      });
    }

    const hashedPassword = await bcrypt.hash(new_password, 10);

    await pool.execute(
      "UPDATE users SET password = ? WHERE id = ?",
      [hashedPassword, admin[0].id]
    );

    return res.json({
      success: true,
      message: "Administrator password reset successfully",
    });
  } catch (error) {
    console.error("Error resetting admin password:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  createHospital,
  getHospitals,
  updateHospital,
  deleteHospital,
  createHospitalAdmin,
  getStatistics,
  resetAdminPassword,
};

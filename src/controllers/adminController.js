const pool = require("../config/db");
const bcrypt = require("bcrypt");

// UPDATE HOSPITAL INFORMATION
const updateHospitalInfo = async (req, res) => {
  try {
    const hospitalId = req.user.hospital_id;
    const { hospital_name, email, phone, address, city, state, country } = req.body;

    if (!hospital_name || !email || !phone || !address || !city || !state || !country) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    await pool.execute(
      `UPDATE hospitals 
       SET hospital_name = ?, email = ?, phone = ?, address = ?, city = ?, state = ?, country = ?
       WHERE hospital_id = ?`,
      [hospital_name, email, phone, address, city, state, country, hospitalId]
    );

    return res.json({
      success: true,
      message: "Hospital information updated successfully",
    });
  } catch (error) {
    console.error("Error updating hospital info:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// GET HOSPITAL PROFILE
const getHospitalProfile = async (req, res) => {
  try {
    const hospitalId = req.user.hospital_id;
    const [rows] = await pool.execute("SELECT * FROM hospitals WHERE hospital_id = ?", [hospitalId]);
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Hospital not found",
      });
    }

    return res.json({
      success: true,
      hospital: rows[0],
    });
  } catch (error) {
    console.error("Error getting hospital profile:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// HELPER FOR USER CREATION
const createSubUser = async (req, res, role) => {
  try {
    const { full_name, email, phone, password } = req.body;
    const hospitalId = req.user.hospital_id;

    if (!full_name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Check unique email
    const [existingEmail] = await pool.execute(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    if (existingEmail.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email is already registered",
      });
    }

    // Check unique phone
    if (phone) {
      const [existingPhone] = await pool.execute(
        "SELECT id FROM users WHERE phone = ?",
        [phone]
      );
      if (existingPhone.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Phone number is already registered by another user",
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(
      `INSERT INTO users (full_name, email, phone, password, role, hospital_id, created_by, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
      [full_name, email.toLowerCase(), phone, hashedPassword, role, hospitalId, req.user.id]
    );

    return res.status(201).json({
      success: true,
      message: `${role.charAt(0) + role.slice(1).toLowerCase()} created successfully`,
      user_id: result.insertId,
    });
  } catch (error) {
    console.error(`Error creating subuser (${role}):`, error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const createDoctor = (req, res) => createSubUser(req, res, "DOCTOR");
const createStaff = (req, res) => createSubUser(req, res, "STAFF");
const createPatient = (req, res) => createSubUser(req, res, "PATIENT");

// GET USERS (DOCTORS, STAFF, PATIENTS) WITHIN THE ADMIN'S HOSPITAL
const getUsers = async (req, res) => {
  try {
    const hospitalId = req.user.hospital_id;
    const { role } = req.query; // optional filter

    let query = "SELECT id, full_name, email, phone, role, status, created_at FROM users WHERE hospital_id = ?";
    const params = [hospitalId];

    if (role) {
      query += " AND role = ?";
      params.push(role);
    } else {
      // Exclude hospital admins and super admins from general subuser list
      query += " AND role NOT IN ('SUPER_ADMIN', 'HOSPITAL_ADMIN')";
    }

    query += " ORDER BY id DESC";

    const [rows] = await pool.execute(query, params);
    return res.json({
      success: true,
      users: rows,
    });
  } catch (error) {
    console.error("Error getting users:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// UPDATE USER (DOCTORS/STAFF/PATIENTS) WITHIN HOSPITAL
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, phone, status, password } = req.body;

    if (!full_name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, and phone are required",
      });
    }

    // Check unique email except this user
    const [existing] = await pool.execute(
      "SELECT id FROM users WHERE email = ? AND id <> ?",
      [email, id]
    );
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email is already registered by another user",
      });
    }

    // Check unique phone except this user
    if (phone) {
      const [existingPhone] = await pool.execute(
        "SELECT id FROM users WHERE phone = ? AND id <> ?",
        [phone, id]
      );
      if (existingPhone.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Phone number is already registered by another user",
        });
      }
    }

    if (password && password.length > 0) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters",
        });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.execute(
        `UPDATE users 
         SET full_name = ?, email = ?, phone = ?, status = ?, password = ?
         WHERE id = ?`,
        [full_name, email.toLowerCase(), phone, status || "active", hashedPassword, id]
      );
    } else {
      await pool.execute(
        `UPDATE users 
         SET full_name = ?, email = ?, phone = ?, status = ?
         WHERE id = ?`,
        [full_name, email.toLowerCase(), phone, status || "active", id]
      );
    }

    return res.json({
      success: true,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// DELETE USER
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.execute("DELETE FROM users WHERE id = ?", [id]);

    return res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// UPLOAD PATIENT REPORT BY ADMIN
const uploadPatientReport = async (req, res) => {
  try {
    const { patient_id, title, category, notes, file_url } = req.body;
    const hospitalId = req.user.hospital_id;

    if (!patient_id || !title || !category) {
      return res.status(400).json({
        success: false,
        message: "Patient ID, title, and category are required",
      });
    }

    // Verify patient belongs to same hospital
    const [patCheck] = await pool.execute(
      "SELECT id FROM users WHERE id = ? AND hospital_id = ? AND role = 'PATIENT'",
      [patient_id, hospitalId]
    );

    if (patCheck.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Patient belongs to a different hospital or does not exist.",
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO reports (patient_id, doctor_id, title, category, hospital_id, notes, file_url)
       VALUES (?, NULL, ?, ?, ?, ?, ?)`,
      [patient_id, title, category, hospitalId, notes || null, file_url || null]
    );

    return res.status(201).json({
      success: true,
      message: "Report uploaded successfully by Admin",
      report_id: result.insertId,
    });
  } catch (error) {
    console.error("Error uploading report by admin:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  updateHospitalInfo,
  getHospitalProfile,
  createDoctor,
  createStaff,
  createPatient,
  getUsers,
  updateUser,
  deleteUser,
  uploadPatientReport,
};

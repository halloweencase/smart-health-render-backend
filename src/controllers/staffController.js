const pool = require("../config/db");
const bcrypt = require("bcrypt");

// GET ALL PATIENTS IN THE STAFF'S HOSPITAL
const getPatients = async (req, res) => {
  try {
    const hospitalId = req.user.hospital_id;

    const [rows] = await pool.execute(
      "SELECT id, full_name, email, phone, status, created_at FROM users WHERE hospital_id = ? AND role = 'PATIENT' ORDER BY full_name ASC",
      [hospitalId]
    );

    return res.json({
      success: true,
      patients: rows,
    });
  } catch (error) {
    console.error("Error getting patients for staff:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// REGISTER PATIENT
const registerPatient = async (req, res) => {
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
    const [existing] = await pool.execute(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email is already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(
      `INSERT INTO users (full_name, email, phone, password, role, hospital_id, created_by, status)
       VALUES (?, ?, ?, ?, 'PATIENT', ?, ?, 'active')`,
      [full_name, email.toLowerCase(), phone, hashedPassword, hospitalId, req.user.id]
    );

    return res.status(201).json({
      success: true,
      message: "Patient registered successfully",
      patient_id: result.insertId,
    });
  } catch (error) {
    console.error("Error registering patient:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// UPDATE PATIENT PROFILE
const updatePatient = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, email, phone, status, password } = req.body;

    if (!full_name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, and phone are required",
      });
    }

    // Check unique email except this patient
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
      message: "Patient profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating patient profile:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// UPLOAD MEDICAL REPORT
const uploadReport = async (req, res) => {
  try {
    const { patient_id, title, category, notes, file_url } = req.body;
    const hospitalId = req.user.hospital_id;

    if (!patient_id || !title || !category) {
      return res.status(400).json({
        success: false,
        message: "Patient, title, and category are required",
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
      message: "Report uploaded successfully by staff",
      report_id: result.insertId,
    });
  } catch (error) {
    console.error("Error uploading report by staff:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// CREATE APPOINTMENT
const createAppointment = async (req, res) => {
  try {
    const { patient_id, doctor_id, appointment_date } = req.body;
    const hospitalId = req.user.hospital_id;

    if (!patient_id || !doctor_id || !appointment_date) {
      return res.status(400).json({
        success: false,
        message: "Patient, doctor, and date are required",
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

    // Verify doctor belongs to same hospital
    const [docCheck] = await pool.execute(
      "SELECT id FROM users WHERE id = ? AND hospital_id = ? AND role = 'DOCTOR'",
      [doctor_id, hospitalId]
    );
    if (docCheck.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Doctor belongs to a different hospital or does not exist.",
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO appointments (patient_id, doctor_id, hospital_id, appointment_date, status)
       VALUES (?, ?, ?, ?, 'scheduled')`,
      [patient_id, doctor_id, hospitalId, appointment_date]
    );

    return res.status(201).json({
      success: true,
      message: "Appointment scheduled successfully",
      appointment_id: result.insertId,
    });
  } catch (error) {
    console.error("Error creating appointment:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// GET APPOINTMENTS IN THE STAFF'S HOSPITAL
const getAppointments = async (req, res) => {
  try {
    const hospitalId = req.user.hospital_id;

    const [rows] = await pool.execute(
      `SELECT a.appointment_id, a.appointment_date, a.status, a.patient_id, a.doctor_id,
              p.full_name AS patient_name, d.full_name AS doctor_name
       FROM appointments a
       JOIN users p ON a.patient_id = p.id
       JOIN users d ON a.doctor_id = d.id
       WHERE a.hospital_id = ?
       ORDER BY a.appointment_date ASC`,
      [hospitalId]
    );

    return res.json({
      success: true,
      appointments: rows,
    });
  } catch (error) {
    console.error("Error getting appointments for staff:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// UPDATE APPOINTMENT STATUS
const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const hospitalId = req.user.hospital_id;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    // Verify appointment belongs to same hospital
    const [appCheck] = await pool.execute(
      "SELECT appointment_id FROM appointments WHERE appointment_id = ? AND hospital_id = ?",
      [id, hospitalId]
    );

    if (appCheck.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Appointment belongs to a different hospital or does not exist.",
      });
    }

    await pool.execute(
      "UPDATE appointments SET status = ? WHERE appointment_id = ?",
      [status, id]
    );

    return res.json({
      success: true,
      message: "Appointment status updated successfully",
    });
  } catch (error) {
    console.error("Error updating appointment status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// GET DOCTORS IN THE STAFF'S HOSPITAL FOR APPOINTMENTS
const getDoctors = async (req, res) => {
  try {
    const hospitalId = req.user.hospital_id;
    const [rows] = await pool.execute(
      "SELECT id, full_name FROM users WHERE hospital_id = ? AND role = 'DOCTOR' AND status = 'active' ORDER BY full_name ASC",
      [hospitalId]
    );
    return res.json({
      success: true,
      doctors: rows,
    });
  } catch (error) {
    console.error("Error getting doctors for staff:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  getPatients,
  registerPatient,
  updatePatient,
  uploadReport,
  createAppointment,
  getAppointments,
  updateAppointment,
  getDoctors,
};

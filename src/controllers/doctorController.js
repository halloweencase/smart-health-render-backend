const pool = require("../config/db");
const bcrypt = require("bcrypt");

// GET ALL PATIENTS IN THE DOCTOR'S HOSPITAL
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
    console.error("Error getting patients for doctor:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// GET PATIENT DETAILS & MEDICAL HISTORY
const getPatientDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const hospitalId = req.user.hospital_id;

    // Fetch patient profile
    const [patientRows] = await pool.execute(
      "SELECT id, full_name, email, phone, status, created_at FROM users WHERE id = ? AND hospital_id = ? AND role = 'PATIENT'",
      [id, hospitalId]
    );

    if (patientRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Patient not found in this hospital",
      });
    }

    // Fetch reports
    const [reports] = await pool.execute(
      "SELECT report_id, title, category, notes, file_url, created_at FROM reports WHERE patient_id = ? ORDER BY created_at DESC",
      [id]
    );

    // Fetch prescriptions
    const [prescriptions] = await pool.execute(
      `SELECT p.prescription_id, p.diagnosis, p.medications, p.notes, p.created_at, u.full_name AS doctor_name 
       FROM prescriptions p
       LEFT JOIN users u ON p.doctor_id = u.id
       WHERE p.patient_id = ? ORDER BY p.created_at DESC`,
      [id]
    );

    // Fetch latest health metrics
    const [metrics] = await pool.execute(
      "SELECT * FROM health_metrics WHERE patient_id = ? ORDER BY created_at DESC LIMIT 5",
      [id]
    );

    // Fetch appointments
    const [appointments] = await pool.execute(
      `SELECT a.appointment_id, a.appointment_date, a.status, u.full_name AS doctor_name 
       FROM appointments a
       LEFT JOIN users u ON a.doctor_id = u.id
       WHERE a.patient_id = ? ORDER BY a.appointment_date DESC`,
      [id]
    );

    return res.json({
      success: true,
      patient: patientRows[0],
      history: {
        reports,
        prescriptions,
        health_metrics: metrics[0] || null, // latest metrics
        metrics_history: metrics,
        appointments,
      },
    });
  } catch (error) {
    console.error("Error getting patient details:", error);
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
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [patient_id, req.user.id, title, category, hospitalId, notes || null, file_url || null]
    );

    return res.status(201).json({
      success: true,
      message: "Report uploaded successfully",
      report_id: result.insertId,
    });
  } catch (error) {
    console.error("Error uploading report:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// ADD OR UPDATE PRESCRIPTION
const addPrescription = async (req, res) => {
  try {
    const { patient_id, diagnosis, medications, notes } = req.body;
    const hospitalId = req.user.hospital_id;

    if (!patient_id || !diagnosis || !medications) {
      return res.status(400).json({
        success: false,
        message: "Patient, diagnosis, and medications are required",
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
      `INSERT INTO prescriptions (patient_id, doctor_id, hospital_id, diagnosis, medications, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [patient_id, req.user.id, hospitalId, diagnosis, medications, notes || null]
    );

    return res.status(201).json({
      success: true,
      message: "Prescription added successfully",
      prescription_id: result.insertId,
    });
  } catch (error) {
    console.error("Error adding prescription:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// UPDATE HEALTH METRICS
const updateHealthMetrics = async (req, res) => {
  try {
    const { patient_id, heart_rate, blood_sugar, blood_pressure, bmi } = req.body;
    const hospitalId = req.user.hospital_id;

    if (!patient_id) {
      return res.status(400).json({
        success: false,
        message: "Patient ID is required",
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

    await pool.execute(
      `INSERT INTO health_metrics (patient_id, hospital_id, heart_rate, blood_sugar, blood_pressure, bmi)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [patient_id, hospitalId, heart_rate || null, blood_sugar || null, blood_pressure || null, bmi || null]
    );

    return res.json({
      success: true,
      message: "Health metrics updated successfully",
    });
  } catch (error) {
    console.error("Error updating health metrics:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// REGISTER PATIENT BY DOCTOR
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
       VALUES (?, ?, ?, ?, 'PATIENT', ?, ?, 'active')`,
      [full_name, email.toLowerCase(), phone, hashedPassword, hospitalId, req.user.id]
    );

    return res.status(201).json({
      success: true,
      message: "Patient registered successfully by doctor",
      patient_id: result.insertId,
    });
  } catch (error) {
    console.error("Error registering patient by doctor:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  getPatients,
  getPatientDetails,
  uploadReport,
  addPrescription,
  updateHealthMetrics,
  registerPatient,
};

const pool = require("../config/db");

// GET OWN MEDICAL REPORTS
const getOwnReports = async (req, res) => {
  try {
    const patientId = req.user.id;

    const [rows] = await pool.execute(
      `SELECT r.report_id, r.title, r.category, r.notes, r.file_url, r.created_at, 
              d.full_name AS doctor_name 
       FROM reports r
       LEFT JOIN users d ON r.doctor_id = d.id
       WHERE r.patient_id = ? 
       ORDER BY r.created_at DESC`,
      [patientId]
    );

    return res.json({
      success: true,
      reports: rows,
    });
  } catch (error) {
    console.error("Error getting reports for patient:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// GET OWN PRESCRIPTIONS
const getOwnPrescriptions = async (req, res) => {
  try {
    const patientId = req.user.id;

    const [rows] = await pool.execute(
      `SELECT p.prescription_id, p.diagnosis, p.medications, p.notes, p.created_at, 
              d.full_name AS doctor_name 
       FROM prescriptions p
       JOIN users d ON p.doctor_id = d.id
       WHERE p.patient_id = ? 
       ORDER BY p.created_at DESC`,
      [patientId]
    );

    return res.json({
      success: true,
      prescriptions: rows,
    });
  } catch (error) {
    console.error("Error getting prescriptions for patient:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// GET OWN APPOINTMENTS
const getOwnAppointments = async (req, res) => {
  try {
    const patientId = req.user.id;

    const [rows] = await pool.execute(
      `SELECT a.appointment_id, a.appointment_date, a.status, 
              d.full_name AS doctor_name, d.phone AS doctor_phone
       FROM appointments a
       JOIN users d ON a.doctor_id = d.id
       WHERE a.patient_id = ? 
       ORDER BY a.appointment_date ASC`,
      [patientId]
    );

    return res.json({
      success: true,
      appointments: rows,
    });
  } catch (error) {
    console.error("Error getting appointments for patient:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// GET OWN HEALTH METRICS
const getOwnMetrics = async (req, res) => {
  try {
    const patientId = req.user.id;

    const [rows] = await pool.execute(
      `SELECT heart_rate, blood_sugar, blood_pressure, bmi, created_at 
       FROM health_metrics 
       WHERE patient_id = ? 
       ORDER BY created_at DESC`,
      [patientId]
    );

    return res.json({
      success: true,
      metrics: rows,
    });
  } catch (error) {
    console.error("Error getting health metrics for patient:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

module.exports = {
  getOwnReports,
  getOwnPrescriptions,
  getOwnAppointments,
  getOwnMetrics,
};

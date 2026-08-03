const prisma = require("../config/db");
const bcrypt = require("bcrypt");

const userFields = { id: true, full_name: true, email: true, phone: true, role: true, status: true, created_at: true };
const patientWhere = (id, hospital_id) => ({ id: Number(id), hospital_id, role: "PATIENT" });

const updateHospitalInfo = async (req, res) => {
  try {
    const { hospital_name, email, phone, address, city, state, country } = req.body;
    if (![hospital_name, email, phone, address, city, state, country].every(Boolean)) return res.status(400).json({ success: false, message: "All fields are required" });
    await prisma.hospital.update({ where: { hospital_id: req.user.hospital_id }, data: { hospital_name, email, phone, address, city, state, country } });
    res.json({ success: true, message: "Hospital information updated successfully" });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: "Internal Server Error" }); }
};
const getHospitalProfile = async (req, res) => {
  try { const hospital = await prisma.hospital.findUnique({ where: { hospital_id: req.user.hospital_id } }); if (!hospital) return res.status(404).json({ success: false, message: "Hospital not found" }); res.json({ success: true, hospital }); }
  catch (error) { console.error(error); res.status(500).json({ success: false, message: "Internal Server Error" }); }
};
const createSubUser = async (req, res, role) => {
  try {
    const { full_name, email, phone, password } = req.body;
    if (![full_name, email, phone, password].every(Boolean)) return res.status(400).json({ success: false, message: "All fields are required" });
    if (await prisma.user.findFirst({ where: { OR: [{ email: email.toLowerCase() }, { phone }] } })) return res.status(400).json({ success: false, message: "Email or phone number is already registered" });
    const user = await prisma.user.create({ data: { full_name, email: email.toLowerCase(), phone, password: await bcrypt.hash(password, 10), role, hospital_id: req.user.hospital_id, created_by: req.user.id } });
    res.status(201).json({ success: true, message: `${role.charAt(0) + role.slice(1).toLowerCase()} created successfully`, user_id: user.id });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: "Internal Server Error" }); }
};
const createDoctor = (req, res) => createSubUser(req, res, "DOCTOR");
const createStaff = (req, res) => createSubUser(req, res, "STAFF");
const createPatient = (req, res) => createSubUser(req, res, "PATIENT");
const getUsers = async (req, res) => {
  try { const where = { hospital_id: req.user.hospital_id, ...(req.query.role ? { role: req.query.role } : { role: { notIn: ["SUPER_ADMIN", "HOSPITAL_ADMIN"] } }) }; res.json({ success: true, users: await prisma.user.findMany({ where, select: userFields, orderBy: { id: "desc" } }) }); }
  catch (error) { console.error(error); res.status(500).json({ success: false, message: "Internal Server Error" }); }
};
const updateUser = async (req, res) => {
  try {
    const { full_name, email, phone, status, password } = req.body; const id = Number(req.params.id);
    if (![full_name, email, phone].every(Boolean)) return res.status(400).json({ success: false, message: "Full name, email, and phone are required" });
    const target = await prisma.user.findFirst({ where: { id, hospital_id: req.user.hospital_id, role: { notIn: ["SUPER_ADMIN", "HOSPITAL_ADMIN"] } } });
    if (!target) return res.status(404).json({ success: false, message: "User not found in this hospital" });
    if (await prisma.user.findFirst({ where: { email: email.toLowerCase(), NOT: { id } } })) return res.status(400).json({ success: false, message: "Email is already registered by another user" });
    const data = { full_name, email: email.toLowerCase(), phone, status: status || "active" }; if (password) { if (password.length < 6) return res.status(400).json({ success: false, message: "Password must be at least 6 characters" }); data.password = await bcrypt.hash(password, 10); }
    await prisma.user.update({ where: { id }, data }); res.json({ success: true, message: "User updated successfully" });
  } catch (error) { console.error(error); res.status(500).json({ success: false, message: "Internal Server Error" }); }
};
const deleteUser = async (req, res) => {
  try { const result = await prisma.user.deleteMany({ where: { id: Number(req.params.id), hospital_id: req.user.hospital_id, role: { notIn: ["SUPER_ADMIN", "HOSPITAL_ADMIN"] } } }); if (!result.count) return res.status(404).json({ success: false, message: "User not found in this hospital" }); res.json({ success: true, message: "User deleted successfully" }); }
  catch (error) { console.error(error); res.status(500).json({ success: false, message: "Internal Server Error" }); }
};
const uploadPatientReport = async (req, res) => {
  try { const { patient_id, title, category, notes, file_url } = req.body; if (!patient_id || !title || !category) return res.status(400).json({ success: false, message: "Patient ID, title, and category are required" }); if (!await prisma.user.findFirst({ where: patientWhere(patient_id, req.user.hospital_id) })) return res.status(403).json({ success: false, message: "Access denied. Patient belongs to a different hospital or does not exist." }); const report = await prisma.report.create({ data: { patient_id: Number(patient_id), title, category, hospital_id: req.user.hospital_id, notes: notes || null, file_url: file_url || null } }); res.status(201).json({ success: true, message: "Report uploaded successfully by Admin", report_id: report.report_id }); }
  catch (error) { console.error(error); res.status(500).json({ success: false, message: "Internal Server Error" }); }
};
module.exports = { updateHospitalInfo, getHospitalProfile, createDoctor, createStaff, createPatient, getUsers, updateUser, deleteUser, uploadPatientReport };

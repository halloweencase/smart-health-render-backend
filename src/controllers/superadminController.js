const prisma = require("../config/db");
const bcrypt = require("bcrypt");

const adminFields = { id: true, full_name: true, email: true, phone: true, role: true, hospital_id: true, status: true };
const normaliseEmail = (email) => email?.trim().toLowerCase();
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const createHospital = async (req, res) => { try { const d = req.body; if (![d.hospital_name, d.registration_number, d.email, d.phone, d.address, d.city, d.state, d.country].every(Boolean)) return res.status(400).json({ success: false, message: "All fields are required" }); if (await prisma.hospital.findUnique({ where: { registration_number: d.registration_number } })) return res.status(400).json({ success: false, message: "Hospital registration number already exists" }); const h = await prisma.hospital.create({ data: { hospital_name: d.hospital_name, registration_number: d.registration_number, email: d.email, phone: d.phone, address: d.address, city: d.city, state: d.state, country: d.country, status: d.status || "active" } }); res.status(201).json({ success: true, message: "Hospital created successfully", hospital_id: h.hospital_id }); } catch (e) { console.error(e); res.status(500).json({ success: false, message: "Internal Server Error" }); } };
const getHospitals = async (req, res) => { try { res.json({ success: true, hospitals: await prisma.hospital.findMany({ orderBy: { hospital_id: "desc" } }) }); } catch (e) { console.error(e); res.status(500).json({ success: false, message: "Internal Server Error" }); } };
const updateHospital = async (req, res) => { try { const id = Number(req.params.id), d = req.body; if (![d.hospital_name, d.registration_number, d.email, d.phone, d.address, d.city, d.state, d.country].every(Boolean)) return res.status(400).json({ success: false, message: "All fields are required" }); if (await prisma.hospital.findFirst({ where: { registration_number: d.registration_number, NOT: { hospital_id: id } } })) return res.status(400).json({ success: false, message: "Hospital registration number already exists for another hospital" }); await prisma.hospital.update({ where: { hospital_id: id }, data: { hospital_name: d.hospital_name, registration_number: d.registration_number, email: d.email, phone: d.phone, address: d.address, city: d.city, state: d.state, country: d.country, status: d.status || "active" } }); res.json({ success: true, message: "Hospital details updated successfully" }); } catch (e) { console.error(e); res.status(500).json({ success: false, message: "Internal Server Error" }); } };
const deleteHospital = async (req, res) => { try { await prisma.hospital.delete({ where: { hospital_id: Number(req.params.id) } }); res.json({ success: true, message: "Hospital deleted successfully" }); } catch (e) { console.error(e); res.status(500).json({ success: false, message: "Internal Server Error" }); } };

const getHospitalAdmin = async (req, res) => {
  try {
    const hospital_id = Number(req.params.hospitalId);
    if (!Number.isInteger(hospital_id)) return res.status(400).json({ success: false, message: "A valid hospital ID is required" });
    const admin = await prisma.user.findFirst({ where: { role: "HOSPITAL_ADMIN", hospital_id }, select: adminFields });
    return res.json({ success: true, admin });
  } catch (e) { console.error(e); return res.status(500).json({ success: false, message: "Internal Server Error" }); }
};

const validateAdmin = (body, passwordRequired) => {
  const full_name = body.full_name?.trim();
  const email = normaliseEmail(body.email);
  const phone = body.phone?.trim();
  const password = body.password;
  if (!full_name || !email || !phone || (passwordRequired && !password)) return { error: "Full name, email, phone, and password are required" };
  if (!validEmail(email)) return { error: "Please enter a valid email address" };
  if (password && password.length < 6) return { error: "Password must be at least 6 characters long" };
  return { full_name, email, phone, password };
};

const createHospitalAdmin = async (req, res) => {
  try {
    const hospital_id = Number(req.body.hospital_id);
    const data = validateAdmin(req.body, true);
    if (data.error) return res.status(400).json({ success: false, message: data.error });
    if (!Number.isInteger(hospital_id) || !await prisma.hospital.findUnique({ where: { hospital_id } })) return res.status(404).json({ success: false, message: "Hospital not found" });
    if (await prisma.user.findFirst({ where: { role: "HOSPITAL_ADMIN", hospital_id } })) return res.status(409).json({ success: false, message: "An administrator is already assigned to this hospital. Use Update Admin instead." });
    if (await prisma.user.findUnique({ where: { email: data.email } })) return res.status(409).json({ success: false, message: "Email is already registered by another user" });
    const admin = await prisma.user.create({ data: { full_name: data.full_name, email: data.email, phone: data.phone, password: await bcrypt.hash(data.password, 10), role: "HOSPITAL_ADMIN", hospital_id, status: "active" }, select: adminFields });
    return res.status(201).json({ success: true, message: "Hospital Administrator created successfully", admin });
  } catch (e) { console.error(e); return res.status(500).json({ success: false, message: "Internal Server Error" }); }
};

const updateHospitalAdmin = async (req, res) => {
  try {
    const hospital_id = Number(req.params.hospitalId);
    const data = validateAdmin(req.body, false);
    if (data.error) return res.status(400).json({ success: false, message: data.error });
    const admin = await prisma.user.findFirst({ where: { role: "HOSPITAL_ADMIN", hospital_id } });
    if (!admin) return res.status(404).json({ success: false, message: "No administrator is assigned to this hospital" });
    const conflict = await prisma.user.findFirst({ where: { email: data.email, NOT: { id: admin.id } } });
    if (conflict) return res.status(409).json({ success: false, message: "Email is already registered by another user" });
    const updates = { full_name: data.full_name, email: data.email, phone: data.phone };
    if (data.password) updates.password = await bcrypt.hash(data.password, 10);
    const updatedAdmin = await prisma.user.update({ where: { id: admin.id }, data: updates, select: adminFields });
    return res.json({ success: true, message: "Hospital Administrator updated successfully", admin: updatedAdmin });
  } catch (e) { console.error(e); return res.status(500).json({ success: false, message: "Internal Server Error" }); }
};

const getStatistics = async (req, res) => { try { const [total_hospitals, active_hospitals, groups] = await Promise.all([prisma.hospital.count(), prisma.hospital.count({ where: { status: "active" } }), prisma.user.groupBy({ by: ["role"], _count: { _all: true } })]), roles = Object.fromEntries(groups.map(x => [x.role, x._count._all])), r = k => roles[k] || 0; res.json({ success: true, statistics: { total_hospitals, active_hospitals, super_admins: r("SUPER_ADMIN"), hospital_admins: r("HOSPITAL_ADMIN"), doctors: r("DOCTOR"), staff: r("STAFF"), patients: r("PATIENT"), total_users: groups.reduce((s, x) => s + x._count._all, 0) } }); } catch (e) { console.error(e); res.status(500).json({ success: false, message: "Internal Server Error" }); } };
const getUsersByRole = async (req, res) => { try { const role = req.query.role; if (!["HOSPITAL_ADMIN", "DOCTOR", "STAFF", "PATIENT"].includes(role)) return res.status(400).json({ success: false, message: "role must be HOSPITAL_ADMIN, DOCTOR, STAFF, or PATIENT" }); const users = await prisma.user.findMany({ where: { role }, select: { id: true, full_name: true, email: true, phone: true, status: true, created_at: true, hospital: { select: { hospital_name: true } } }, orderBy: { full_name: "asc" } }); res.json({ success: true, users: users.map(({ hospital, ...user }) => ({ ...user, hospital_name: hospital?.hospital_name || "Not assigned" })) }); } catch (e) { console.error(e); res.status(500).json({ success: false, message: "Internal Server Error" }); } };
const deleteUser = async (req, res) => { try { const id = Number(req.params.id); if (!Number.isInteger(id)) return res.status(400).json({ success: false, message: "A valid user ID is required" }); if (id === req.user.id) return res.status(400).json({ success: false, message: "You cannot delete your own Super Admin account" }); const user = await prisma.user.findUnique({ where: { id }, select: { role: true } }); if (!user) return res.status(404).json({ success: false, message: "User not found" }); if (user.role === "SUPER_ADMIN") return res.status(403).json({ success: false, message: "Super Admin accounts cannot be deleted" }); await prisma.user.delete({ where: { id } }); res.json({ success: true, message: "User deleted successfully" }); } catch (e) { console.error(e); res.status(500).json({ success: false, message: "Internal Server Error" }); } };
const resetAdminPassword = async (req, res) => { try { const { hospital_id, new_password } = req.body; if (!hospital_id || !new_password) return res.status(400).json({ success: false, message: "Hospital ID and new password are required" }); if (new_password.length < 6) return res.status(400).json({ success: false, message: "Password must be at least 6 characters long" }); const u = await prisma.user.findFirst({ where: { role: "HOSPITAL_ADMIN", hospital_id: Number(hospital_id) } }); if (!u) return res.status(404).json({ success: false, message: "No administrator assigned to this hospital yet" }); await prisma.user.update({ where: { id: u.id }, data: { password: await bcrypt.hash(new_password, 10) } }); res.json({ success: true, message: "Administrator password reset successfully" }); } catch (e) { console.error(e); res.status(500).json({ success: false, message: "Internal Server Error" }); } };

module.exports = { createHospital, getHospitals, updateHospital, deleteHospital, getHospitalAdmin, createHospitalAdmin, updateHospitalAdmin, getStatistics, getUsersByRole, deleteUser, resetAdminPassword };

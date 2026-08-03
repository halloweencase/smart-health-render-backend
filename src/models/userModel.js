const prisma = require("../config/db");

const createUser = (data) => prisma.user.create({ data: {
  full_name: data.full_name, email: data.email, phone: data.phone, password: data.password,
  role: data.role || "PATIENT", hospital_id: data.hospital_id || null, created_by: data.created_by || null,
} });
const findUserByEmail = (email) => prisma.user.findUnique({ where: { email } });
const findUserById = (id) => prisma.user.findUnique({
  where: { id: Number(id) }, select: { id: true, full_name: true, email: true, phone: true, role: true, hospital_id: true, status: true },
});
const findUserByIdWithPassword = (id) => prisma.user.findUnique({ where: { id: Number(id) } });
const findUserByEmailExceptId = (email, id) => prisma.user.findFirst({ where: { email, NOT: { id: Number(id) } } });
const updateUserProfile = (id, data) => prisma.user.update({ where: { id: Number(id) }, data });
const updateUserPassword = (id, password) => prisma.user.update({ where: { id: Number(id) }, data: { password } });

module.exports = { createUser, findUserByEmail, findUserById, findUserByIdWithPassword, findUserByEmailExceptId, updateUserProfile, updateUserPassword };

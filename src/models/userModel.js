const pool = require("../config/db");

const createUser = async (userData) => {
  const { full_name, email, phone, password, role, hospital_id, created_by } = userData;

  const [result] = await pool.execute(
    `INSERT INTO users (full_name, email, phone, password, role, hospital_id, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      full_name,
      email,
      phone,
      password,
      role || "PATIENT",
      hospital_id || null,
      created_by || null,
    ]
  );

  return result;
};

const findUserByEmail = async (email) => {
  const [rows] = await pool.execute(
    "SELECT * FROM users WHERE email = ?",
    [email]
  );

  return rows[0];
};

const findUserById = async (id) => {
  const [rows] = await pool.execute(
    "SELECT id, full_name, email, phone, role, hospital_id, status FROM users WHERE id = ?",
    [id]
  );

  return rows[0];
};

const findUserByIdWithPassword = async (id) => {
  const [rows] = await pool.execute(
    "SELECT * FROM users WHERE id = ?",
    [id]
  );

  return rows[0];
};

const findUserByEmailExceptId = async (email, id) => {
  const [rows] = await pool.execute(
    "SELECT * FROM users WHERE email = ? AND id <> ?",
    [email, id]
  );

  return rows[0];
};

const updateUserProfile = async (id, userData) => {
  const { full_name, email, phone } = userData;

  const [result] = await pool.execute(
    `UPDATE users
     SET full_name = ?, email = ?, phone = ?
     WHERE id = ?`,
    [full_name, email, phone, id]
  );

  return result;
};

const updateUserPassword = async (id, hashedPassword) => {
  const [result] = await pool.execute(
    "UPDATE users SET password = ? WHERE id = ?",
    [hashedPassword, id]
  );

  return result;
};

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByIdWithPassword,
  findUserByEmailExceptId,
  updateUserProfile,
  updateUserPassword,
};

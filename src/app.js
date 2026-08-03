const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const superadminRoutes = require("./routes/superadminRoutes");
const adminRoutes = require("./routes/adminRoutes");
const doctorRoutes = require("./routes/doctorRoutes");
const staffRoutes = require("./routes/staffRoutes");
const patientRoutes = require("./routes/patientRoutes");

const upload = require("./middleware/uploadMiddleware");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.post("/api/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }
  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
  return res.json({ success: true, file_url: fileUrl });
});

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Smart Health Backend Running 🚀",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/superadmin", superadminRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/patient", patientRoutes);

module.exports = app;
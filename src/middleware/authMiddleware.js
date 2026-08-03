const jwt = require("jsonwebtoken");
const prisma = require("../config/db");

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      success: false,
      message: "JWT_SECRET is not configured",
    });
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication token is required",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
      });
    }

    next();
  };
};

const authorizeHospitalAccess = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  // Super Admin bypasses all hospital checks
  if (req.user.role === "SUPER_ADMIN") {
    return next();
  }

  const userHospitalId = req.user.hospital_id;
  if (!userHospitalId) {
    return res.status(403).json({
      success: false,
      message: "Access denied. User has no hospital assignment.",
    });
  }

  const targetId = req.params.id;

  if (targetId) {
    try {
      const fullUrl = req.baseUrl + req.path;

      // If checking users (admin managing users, doctor/staff checking patient)
      if (fullUrl.includes("/admin/users") || fullUrl.includes("/doctor/patient") || fullUrl.includes("/staff/patient")) {
        const user = await prisma.user.findUnique({ where: { id: Number(targetId) }, select: { hospital_id: true } });
        if (user && user.hospital_id !== userHospitalId) {
          return res.status(403).json({
            success: false,
            message: "Access denied. Target user belongs to a different hospital.",
          });
        }
      }

      // If checking reports
      if (fullUrl.includes("/report")) {
        const report = await prisma.report.findUnique({ where: { report_id: Number(targetId) }, select: { hospital_id: true } });
        if (report && report.hospital_id !== userHospitalId) {
          return res.status(403).json({
            success: false,
            message: "Access denied. Target report belongs to a different hospital.",
          });
        }
      }
    } catch (err) {
      console.error("Error in authorizeHospitalAccess middleware:", err);
      return res.status(500).json({
        success: false,
        message: "Internal server error during authorization checks.",
      });
    }
  }

  next();
};

module.exports = {
  requireAuth,
  requireRole,
  authorizeHospitalAccess,
};

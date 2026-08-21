const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.userRole !== "ADMIN" && req.userRole !== "SUPERADMIN") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

const superAdminMiddleware = (req, res, next) => {
  if (req.userRole !== "SUPERADMIN") {
    return res.status(403).json({ error: "SuperAdmin access required" });
  }
  next();
};

const subAdminMiddleware = (req, res, next) => {
  if (req.userRole !== "SUBADMIN") {
    return res.status(403).json({ error: "SubAdmin access required" });
  }
  next();
};

module.exports = { authMiddleware, adminMiddleware, superAdminMiddleware, subAdminMiddleware };

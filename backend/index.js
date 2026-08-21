const express = require("express");
const http = require("http");
const cors = require("cors");
require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const { initializeSocket } = require("./services/socketManager");
const authRoutes = require("./routes/auth");
const complaintRoutes = require("./routes/complaints");
const leaderboardRoutes = require("./routes/leaderboard");
const adminRoutes = require("./routes/admin");
const superadminRoutes = require("./routes/superadmin");
const subadminRoutes = require("./routes/subadmin");
const chatRoutes = require("./routes/chat");
const twitterRoutes = require("./routes/twitter");
const bidsRoutes = require("./routes/bids");
const dashboardRoutes = require("./routes/dashboard");
const notificationRoutes = require("./routes/notifications");
const { startEscalationScheduler } = require("./jobs/escalationScheduler");

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO on the shared HTTP server
const io = initializeSocket(server);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "CitiFix backend running successfully" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/superadmin", superadminRoutes);
app.use("/api/subadmin", subadminRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/twitter", twitterRoutes);
app.use("/api/bids", bidsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// Serve frontend static build
const path = require("path");
const frontendDist = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendDist));

// SPA catch-all route for frontend
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "Route not found" });
  }
  res.sendFile(path.join(frontendDist, "index.html"));
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO ready on port ${PORT}`);
  startEscalationScheduler();
});


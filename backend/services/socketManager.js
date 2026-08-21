const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

let io = null;

/**
 * Initialize Socket.IO server on the given HTTP server.
 */
const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 60000,
    transports: ["websocket", "polling"],
  });

  // JWT authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      return next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const { userId, userRole } = socket;
    console.log(`[Socket] ✅ User ${userId} (${userRole}) connected — ${socket.id}`);

    // Join personal room and role room
    socket.join(`user:${userId}`);
    socket.join(`role:${userRole}`);

    // Allow clients to subscribe to specific complaint updates
    socket.on("subscribe:complaint", (complaintId) => {
      socket.join(`complaint:${complaintId}`);
    });

    socket.on("unsubscribe:complaint", (complaintId) => {
      socket.leave(`complaint:${complaintId}`);
    });

    // Allow admin/superadmin clients to subscribe to live analytics
    socket.on("subscribe:analytics", () => {
      if (["ADMIN", "SUPERADMIN"].includes(userRole)) {
        socket.join("analytics");
      }
    });

    socket.on("unsubscribe:analytics", () => {
      socket.leave("analytics");
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket] ❌ User ${userId} disconnected — ${reason}`);
    });
  });

  // Start periodic analytics broadcast every 5 seconds
  startAnalyticsBroadcast();

  return io;
};

/**
 * Get the Socket.IO instance.
 */
const getIO = () => {
  if (!io) {
    console.warn("[Socket] Socket.IO not initialized yet");
  }
  return io;
};

/**
 * Send event to a specific user.
 */
const notifyUser = (userId, event, data) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
};

/**
 * Send event to all users of a specific role.
 */
const notifyRole = (role, event, data) => {
  if (!io) return;
  io.to(`role:${role}`).emit(event, data);
};

/**
 * Broadcast to all connected clients.
 */
const broadcast = (event, data) => {
  if (!io) return;
  io.emit(event, data);
};

/**
 * Emit event to all subscribers of a complaint.
 */
const notifyComplaintSubscribers = (complaintId, event, data) => {
  if (!io) return;
  io.to(`complaint:${complaintId}`).emit(event, data);
};

/**
 * Push live analytics to all clients in the "analytics" room.
 */
const broadcastAnalytics = async () => {
  if (!io) return;

  const room = io.sockets.adapter.rooms.get("analytics");
  if (!room || room.size === 0) return; // No listeners, skip

  try {
    const [totalComplaints, totalUsers, pendingCount, assignedCount, resolvedCount, escalatedCount] =
      await Promise.all([
        prisma.complaint.count(),
        prisma.user.count(),
        prisma.complaint.count({ where: { status: "OPEN" } }),
        prisma.complaint.count({ where: { status: "ASSIGNED" } }),
        prisma.complaint.count({ where: { status: "RESOLVED" } }),
        prisma.complaint.count({ where: { status: "ESCALATED" } }),
      ]);

    const resolutionRate = totalComplaints > 0
      ? Math.round((resolvedCount / totalComplaints) * 100)
      : 0;

    io.to("analytics").emit("analytics:update", {
      totalComplaints,
      totalUsers,
      pendingCount,
      assignedCount,
      resolvedCount,
      escalatedCount,
      resolutionRate,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Socket] Analytics broadcast error:", err.message);
  }
};

let analyticsInterval = null;

const startAnalyticsBroadcast = () => {
  if (analyticsInterval) clearInterval(analyticsInterval);
  analyticsInterval = setInterval(broadcastAnalytics, 5000);
};

module.exports = {
  initializeSocket,
  getIO,
  notifyUser,
  notifyRole,
  broadcast,
  notifyComplaintSubscribers,
  broadcastAnalytics,
};

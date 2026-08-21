const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// Get user's notifications (paginated)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit),
      }),
      prisma.notification.count({ where: { userId: req.userId } }),
      prisma.notification.count({ where: { userId: req.userId, read: false } }),
    ]);

    // Parse metadata JSON for each notification
    const parsed = notifications.map((n) => ({
      ...n,
      metadata: n.metadata ? JSON.parse(n.metadata) : null,
    }));

    res.json({
      notifications: parsed,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get unread count
router.get("/unread-count", authMiddleware, async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.userId, read: false },
    });
    res.json({ unreadCount: count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark single notification as read
router.patch("/:id/read", authMiddleware, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id, 10);

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== req.userId) {
      return res.status(404).json({ error: "Notification not found" });
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    res.json({
      ...updated,
      metadata: updated.metadata ? JSON.parse(updated.metadata) : null,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark all notifications as read
router.patch("/read-all", authMiddleware, async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId, read: false },
      data: { read: true },
    });

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

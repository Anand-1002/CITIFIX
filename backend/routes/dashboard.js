const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authMiddleware, adminMiddleware } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// Comprehensive real-time analytics endpoint
router.get("/analytics", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Core counts
    const [totalComplaints, totalUsers, pendingCount, assignedCount, resolvedCount, escalatedCount, slaBreachedCount] =
      await Promise.all([
        prisma.complaint.count(),
        prisma.user.count(),
        prisma.complaint.count({ where: { status: "OPEN" } }),
        prisma.complaint.count({ where: { status: "ASSIGNED" } }),
        prisma.complaint.count({ where: { status: "RESOLVED" } }),
        prisma.complaint.count({ where: { status: "ESCALATED" } }),
        prisma.complaint.count({ where: { slaBreached: true } }),
      ]);

    // Resolution rate
    const resolutionRate = totalComplaints > 0
      ? Math.round((resolvedCount / totalComplaints) * 100)
      : 0;

    // SLA compliance rate
    const assignedTotal = assignedCount + resolvedCount + escalatedCount;
    const slaComplianceRate = assignedTotal > 0
      ? Math.round(((assignedTotal - slaBreachedCount) / assignedTotal) * 100)
      : 100;

    // Average resolution time (in hours)
    const resolvedComplaints = await prisma.complaint.findMany({
      where: { status: "RESOLVED", resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
    });

    let avgResolutionHours = 0;
    if (resolvedComplaints.length > 0) {
      const totalHours = resolvedComplaints.reduce((sum, c) => {
        const diff = new Date(c.resolvedAt) - new Date(c.createdAt);
        return sum + diff / (1000 * 60 * 60);
      }, 0);
      avgResolutionHours = Math.round(totalHours / resolvedComplaints.length);
    }

    // Complaints by category
    const complaintsByCategory = await prisma.complaint.groupBy({
      by: ["category"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    // Complaints by status
    const complaintsByStatus = await prisma.complaint.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    // 7-day trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentComplaints = await prisma.complaint.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true, status: true },
      orderBy: { createdAt: "asc" },
    });

    // Group by day
    const trendMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      trendMap[key] = { date: key, created: 0, resolved: 0 };
    }

    recentComplaints.forEach((c) => {
      const key = new Date(c.createdAt).toISOString().split("T")[0];
      if (trendMap[key]) {
        trendMap[key].created++;
        if (c.status === "RESOLVED") {
          trendMap[key].resolved++;
        }
      }
    });

    const dailyTrend = Object.values(trendMap);

    // Recent activity feed (last 20 complaints with actions)
    const recentActivity = await prisma.complaint.findMany({
      take: 20,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        category: true,
        votes: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { name: true } },
      },
    });

    const activityFeed = recentActivity.map((c) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      category: c.category,
      votes: c.votes,
      userName: c.user?.name || "Anonymous",
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

    // Top voted complaints
    const topVoted = await prisma.complaint.findMany({
      take: 5,
      where: { status: { not: "RESOLVED" } },
      orderBy: { votes: "desc" },
      select: {
        id: true,
        title: true,
        category: true,
        votes: true,
        status: true,
      },
    });

    res.json({
      kpis: {
        totalComplaints,
        totalUsers,
        pendingCount,
        assignedCount,
        resolvedCount,
        escalatedCount,
        resolutionRate,
        slaComplianceRate,
        avgResolutionHours,
      },
      complaintsByCategory: complaintsByCategory.map((item) => ({
        name: item.category,
        count: item._count.id,
      })),
      complaintsByStatus: complaintsByStatus.map((item) => ({
        name: item.status,
        count: item._count.id,
      })),
      dailyTrend,
      activityFeed,
      topVoted,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Dashboard] Analytics error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authMiddleware, subAdminMiddleware } = require("../middleware/auth");
const { buildHashtags } = require("../services/xEscalationService"); // Used for formatting

const router = express.Router();
const prisma = new PrismaClient();

const toClientComplaint = (complaint) => {
  return {
    id: complaint.id,
    title: complaint.title,
    description: complaint.description,
    category: complaint.category,
    location: {
      latitude: complaint.latitude,
      longitude: complaint.longitude,
    },
    latitude: complaint.latitude,
    longitude: complaint.longitude,
    address: complaint.address,
    image: complaint.imageUrl,
    imageUrl: complaint.imageUrl,
    status: complaint.status.toLowerCase(),
    votes: complaint.votes,
    anonymous: complaint.anonymous,
    assignedDepartment: complaint.assignedDepartment,
    assignedAdminId: complaint.assignedAdminId,
    assignedAt: complaint.assignedAt,
    slaDeadline: complaint.slaDeadline,
    slaBreached: complaint.slaBreached,
    hashtags: buildHashtags(complaint),
    userId: complaint.userId,
    userName: complaint.user?.name,
    user: complaint.user ? {
      id: complaint.user.id,
      name: complaint.user.name,
      phone: complaint.user.phone,
    } : null,
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
    // Project details
    projectAmount: complaint.projectAmount,
    warrantyPeriod: complaint.warrantyPeriod,
    projectDeadline: complaint.projectDeadline,
    projectNote: complaint.projectNote,
    extensionRequests: complaint.extensionRequests || [],
    // Raised Issue fields
    isOnHold: complaint.isOnHold || false,
    raisedIssues: complaint.raisedIssues || [],
  };
};

// Get assigned complaints
router.get("/complaints", authMiddleware, subAdminMiddleware, async (req, res) => {
  try {
    const complaints = await prisma.complaint.findMany({
      where: { assignedAdminId: req.userId },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        extensionRequests: { orderBy: { createdAt: "desc" }, take: 1 },
        raisedIssues: {
          orderBy: { createdAt: "desc" },
          include: {
            raisedBy: { select: { id: true, name: true } },
            assignedTo: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [
        { slaDeadline: "asc" },
        { createdAt: "desc" }
      ],
    });

    res.json(complaints.map(c => toClientComplaint(c)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request time extension for an assigned complaint
router.post("/complaints/:id/request-extension", authMiddleware, subAdminMiddleware, async (req, res) => {
  try {
    const { reason, requestedDays } = req.body;
    const complaintId = parseInt(req.params.id, 10);

    if (!reason || !requestedDays || requestedDays < 1) {
      return res.status(400).json({ error: "Reason and requestedDays (min 1) are required" });
    }

    const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) return res.status(404).json({ error: "Complaint not found" });
    if (complaint.assignedAdminId !== req.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Check no pending request already exists
    const existing = await prisma.extensionRequest.findFirst({
      where: { complaintId, status: "PENDING" }
    });
    if (existing) return res.status(400).json({ error: "A pending extension request already exists" });

    const request = await prisma.extensionRequest.create({
      data: {
        complaintId,
        requestedById: req.userId,
        reason,
        requestedDays: parseInt(requestedDays, 10),
      }
    });

    res.json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get extension requests for a complaint
router.get("/complaints/:id/extension-requests", authMiddleware, subAdminMiddleware, async (req, res) => {
  try {
    const complaintId = parseInt(req.params.id, 10);
    const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) return res.status(404).json({ error: "Complaint not found" });
    if (complaint.assignedAdminId !== req.userId) return res.status(403).json({ error: "Not authorized" });

    const requests = await prisma.extensionRequest.findMany({
      where: { complaintId },
      orderBy: { createdAt: "desc" }
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update complaint status
router.patch("/complaints/:id/status", authMiddleware, subAdminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const complaintId = parseInt(req.params.id, 10);

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const nextStatus = String(status).toUpperCase();

    const previous = await prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!previous) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    if (previous.assignedAdminId !== req.userId) {
      return res.status(403).json({ error: "Not authorized to update this complaint" });
    }

    if (previous.isOnHold) {
      return res.status(400).json({ error: "Cannot update status while complaint is on hold due to a raised issue" });
    }

    const complaint = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: nextStatus,
        resolvedAt: nextStatus === "RESOLVED" ? new Date() : null,
      },
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
    });

    if (nextStatus === "RESOLVED" && previous.status !== "RESOLVED") {
      await prisma.user.update({
        where: { id: complaint.userId },
        data: {
          rewardPoints: {
            increment: 10,
          },
        },
      });
    }

    res.json(toClientComplaint(complaint));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────── RAISED ISSUES ───────────────────────────

// SubAdmin raises an issue on one of their assigned complaints
router.post("/complaints/:id/raise-issue", authMiddleware, subAdminMiddleware, async (req, res) => {
  try {
    const complaintId = parseInt(req.params.id, 10);
    const { title, description } = req.body;

    if (!title?.trim() || !description?.trim()) {
      return res.status(400).json({ error: "Title and description are required" });
    }

    const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) return res.status(404).json({ error: "Complaint not found" });
    if (complaint.assignedAdminId !== req.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }
    if (complaint.isOnHold) {
      return res.status(400).json({ error: "A raised issue is already pending for this complaint" });
    }

    // Create the raised issue and put the complaint on hold in a transaction
    const raisedIssue = await prisma.$transaction(async (tx) => {
      const issue = await tx.raisedIssue.create({
        data: {
          complaintId,
          raisedById: req.userId,
          title: title.trim(),
          description: description.trim(),
        },
      });
      await tx.complaint.update({
        where: { id: complaintId },
        data: { isOnHold: true },
      });
      return issue;
    });

    res.json(raisedIssue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SubAdmin gets raised issues assigned TO them (for resolution)
router.get("/raised-issues", authMiddleware, subAdminMiddleware, async (req, res) => {
  try {
    const issues = await prisma.raisedIssue.findMany({
      where: { assignedToId: req.userId, status: { not: "RESOLVED" } },
      include: {
        complaint: {
          select: {
            id: true, title: true, category: true, address: true, imageUrl: true,
            projectAmount: true, projectNote: true,
          },
        },
        raisedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(issues);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SubAdmin resolves a raised issue assigned to them
router.patch("/raised-issues/:id/resolve", authMiddleware, subAdminMiddleware, async (req, res) => {
  try {
    const issueId = parseInt(req.params.id, 10);

    const issue = await prisma.raisedIssue.findUnique({
      where: { id: issueId },
      include: { complaint: true },
    });

    if (!issue) return res.status(404).json({ error: "Raised issue not found" });
    if (issue.assignedToId !== req.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }
    if (issue.status === "RESOLVED") {
      return res.status(400).json({ error: "Already resolved" });
    }

    await prisma.$transaction(async (tx) => {
      // Mark the raised issue as resolved
      await tx.raisedIssue.update({
        where: { id: issueId },
        data: { status: "RESOLVED" },
      });
      // Check if ALL raised issues on the parent complaint are now resolved
      const pending = await tx.raisedIssue.count({
        where: { complaintId: issue.complaintId, status: { not: "RESOLVED" } },
      });
      // If none pending, release the hold on the original complaint
      if (pending === 0) {
        await tx.complaint.update({
          where: { id: issue.complaintId },
          data: { isOnHold: false },
        });
      }
    });

    res.json({ message: "Raised issue resolved successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

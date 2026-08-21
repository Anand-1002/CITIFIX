const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authMiddleware, superAdminMiddleware } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// Get all users
router.get("/users", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        department: true,
        rewardPoints: true,
        createdAt: true,
        _count: { select: { complaints: true, assignedComplaints: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user role
router.patch("/users/:id/role", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { role, department } = req.body;
    const userId = parseInt(req.params.id, 10);

    if (!["CITIZEN", "ADMIN", "SUPERADMIN", "SUBADMIN"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    if (role === "SUBADMIN" && !department) {
      return res.status(400).json({ error: "Department is required for SubAdmin" });
    }

    if (userId === req.userId) {
      return res.status(400).json({ error: "Cannot change your own role" });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { 
        role,
        department: role === "SUBADMIN" ? department : null,
      },
      select: { id: true, name: true, role: true, phone: true, department: true }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign sub-admin to a complaint (with project details)
router.post("/complaints/:id/assign", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { subAdminId, projectAmount, warrantyPeriod, projectDeadline, projectNote } = req.body;
    const complaintId = parseInt(req.params.id, 10);

    const subAdmin = await prisma.user.findUnique({ where: { id: subAdminId } });
    if (!subAdmin || subAdmin.role !== "SUBADMIN") {
      return res.status(400).json({ error: "Invalid sub-admin ID" });
    }

    const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    // Determine deadline: use projectDeadline if provided, else compute from SLA
    let deadline;
    if (projectDeadline) {
      deadline = new Date(projectDeadline);
    } else {
      const config = await prisma.slaConfig.findUnique({ where: { department: complaint.category } });
      const daysToResolve = config ? config.daysToResolve : 7;
      deadline = new Date();
      deadline.setDate(deadline.getDate() + daysToResolve);
    }

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        assignedAdminId: subAdminId,
        assignedAt: new Date(),
        slaDeadline: deadline,
        status: "ASSIGNED",
        slaBreached: false,
        slaBreach: "NONE",
        projectAmount: projectAmount ? parseFloat(projectAmount) : null,
        warrantyPeriod: warrantyPeriod ? parseInt(warrantyPeriod, 10) : null,
        projectDeadline: projectDeadline ? new Date(projectDeadline) : null,
        projectNote: projectNote || null,
      },
      include: {
        assignedAdmin: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true, phone: true } },
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unassign sub-admin
router.delete("/complaints/:id/assign", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const complaintId = parseInt(req.params.id, 10);

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        assignedAdminId: null,
        assignedAt: null,
        slaDeadline: null,
        status: "OPEN",
        slaBreached: false,
        slaBreach: "NONE"
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get SLA configs
router.get("/sla", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const configs = await prisma.slaConfig.findMany({
      include: { updatedBy: { select: { name: true } } },
    });
    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set SLA config
router.put("/sla/:department", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { daysToResolve } = req.body;
    const department = req.params.department;

    if (!daysToResolve || daysToResolve < 1) {
      return res.status(400).json({ error: "Invalid days to resolve" });
    }

    const config = await prisma.slaConfig.upsert({
      where: { department },
      update: {
        daysToResolve: parseInt(daysToResolve, 10),
        updatedById: req.userId,
      },
      create: {
        department,
        daysToResolve: parseInt(daysToResolve, 10),
        updatedById: req.userId,
      },
    });

    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Get all pending extension requests
router.get("/extension-requests", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const requests = await prisma.extensionRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        requestedBy: { select: { id: true, name: true, phone: true } },
        complaint: {
          select: {
            id: true, title: true, category: true,
            slaDeadline: true, projectDeadline: true,
            assignedAdmin: { select: { name: true } }
          }
        }
      }
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Approve or reject an extension request
router.patch("/extension-requests/:id", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { status, reviewNote } = req.body;
    const requestId = parseInt(req.params.id, 10);

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return res.status(400).json({ error: "Status must be APPROVED or REJECTED" });
    }

    const extRequest = await prisma.extensionRequest.findUnique({
      where: { id: requestId },
      include: { complaint: true }
    });

    if (!extRequest) return res.status(404).json({ error: "Request not found" });
    if (extRequest.status !== "PENDING") return res.status(400).json({ error: "Already reviewed" });

    const updated = await prisma.extensionRequest.update({
      where: { id: requestId },
      data: { status, reviewNote: reviewNote || null }
    });

    // If approved, extend the SLA/project deadline on the complaint
    if (status === "APPROVED") {
      const complaint = extRequest.complaint;
      const baseDate = complaint.projectDeadline || complaint.slaDeadline || new Date();
      const newDeadline = new Date(baseDate);
      newDeadline.setDate(newDeadline.getDate() + extRequest.requestedDays);

      await prisma.complaint.update({
        where: { id: complaint.id },
        data: {
          slaDeadline: newDeadline,
          projectDeadline: complaint.projectDeadline ? newDeadline : undefined,
          slaBreached: false,
        }
      });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get superadmin analytics
router.get("/analytics", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const totalComplaints = await prisma.complaint.count();
    const breachedComplaints = await prisma.complaint.count({ where: { slaBreached: true } });
    
    const userRoleCounts = await prisma.user.groupBy({
      by: ["role"],
      _count: { id: true }
    });

    const subAdmins = await prisma.user.findMany({
      where: { role: "SUBADMIN" },
      select: {
        id: true,
        name: true,
        assignedComplaints: {
          select: {
            status: true,
            slaBreached: true,
            assignedAt: true,
            resolvedAt: true
          }
        }
      }
    });

    const subAdminPerformance = subAdmins.map(admin => {
      const assigned = admin.assignedComplaints;
      const resolved = assigned.filter(c => c.status === "RESOLVED");
      const breached = assigned.filter(c => c.slaBreached);
      
      let totalResolutionTime = 0;
      let validResolutionCount = 0;

      resolved.forEach(c => {
        if (c.assignedAt && c.resolvedAt) {
          totalResolutionTime += (new Date(c.resolvedAt) - new Date(c.assignedAt));
          validResolutionCount++;
        }
      });

      const avgResolutionTimeMs = validResolutionCount > 0 ? totalResolutionTime / validResolutionCount : null;
      const avgResolutionTimeHours = avgResolutionTimeMs ? (avgResolutionTimeMs / (1000 * 60 * 60)).toFixed(1) : null;

      return {
        id: admin.id,
        name: admin.name,
        assignedCount: assigned.length,
        resolvedCount: resolved.length,
        breachedCount: breached.length,
        avgResolutionHours: avgResolutionTimeHours
      };
    });

    res.json({
      system: {
        totalComplaints,
        breachedComplaints,
        roles: userRoleCounts
      },
      subAdmins: subAdminPerformance
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────── RAISED ISSUES ───────────────────────────

// Get all raised issues
router.get("/raised-issues", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const issues = await prisma.raisedIssue.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        raisedBy: { select: { id: true, name: true, phone: true } },
        assignedTo: { select: { id: true, name: true, phone: true } },
        complaint: {
          select: {
            id: true, title: true, category: true, address: true,
            assignedAdmin: { select: { id: true, name: true } },
          },
        },
      },
    });
    res.json(issues);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Assign a SubAdmin to resolve a raised issue
router.patch("/raised-issues/:id/assign", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const issueId = parseInt(req.params.id, 10);
    const { subAdminId } = req.body;

    if (!subAdminId) {
      return res.status(400).json({ error: "subAdminId is required" });
    }

    const subAdmin = await prisma.user.findUnique({ where: { id: parseInt(subAdminId, 10) } });
    if (!subAdmin || subAdmin.role !== "SUBADMIN") {
      return res.status(400).json({ error: "Invalid sub-admin" });
    }

    const issue = await prisma.raisedIssue.findUnique({ where: { id: issueId } });
    if (!issue) return res.status(404).json({ error: "Raised issue not found" });
    if (issue.status === "RESOLVED") {
      return res.status(400).json({ error: "Issue already resolved" });
    }

    const updated = await prisma.raisedIssue.update({
      where: { id: issueId },
      data: {
        assignedToId: parseInt(subAdminId, 10),
        status: "ASSIGNED",
      },
      include: {
        raisedBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
        complaint: { select: { id: true, title: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

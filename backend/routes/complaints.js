const express = require("express");
const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const { authMiddleware } = require("../middleware/auth");
const {
  isEligibleForEscalation,
  postComplaintToX,
  markPostAttempt,
  markPostSuccess,
  markPostFailure,
  buildHashtags,
} = require("../services/xEscalationService");
const {
  onComplaintCreated,
  onComplaintVoted,
  onComplaintEscalated,
  onStatusChanged,
} = require("../services/notificationService");

const router = express.Router();
const prisma = new PrismaClient();

const decodeViewer = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return { id: null, role: null };
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");
    return { id: decoded.id, role: decoded.role };
  } catch {
    return { id: null, role: null };
  }
};

const toClientComplaint = (complaint, viewer = { id: null, role: null }) => {
  const isOwner = viewer.id && viewer.id === complaint.userId;
  const isAdmin = viewer.role === "ADMIN";
  const canViewIdentity = isOwner || isAdmin;

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
    tweetPosted: complaint.tweetPosted,
    escalatedAt: complaint.escalatedAt,
    assignedDepartment: complaint.assignedDepartment,
    xPostUrl: complaint.xPostUrl,
    xPostStatus: complaint.xPostStatus,
    hashtags: buildHashtags(complaint),
    userId: canViewIdentity ? complaint.userId : null,
    userName: canViewIdentity ? complaint.user?.name : null,
    user: canViewIdentity && complaint.user
      ? {
          id: complaint.user.id,
          name: complaint.user.name,
          email: complaint.user.email,
          phone: complaint.user.phone,
        }
      : null,
    hasVoted: viewer.id
      ? complaint.complaintVotes?.some((vote) => vote.userId === viewer.id) || false
      : false,
    createdAt: complaint.createdAt,
    updatedAt: complaint.updatedAt,
  };
};

// Create complaint
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title, description, category, latitude, longitude, address, imageUrl, image } = req.body;

    if (!title || !description || !category || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const complaint = await prisma.complaint.create({
      data: {
        title,
        description,
        category,
        latitude,
        longitude,
        address: address || null,
        imageUrl: imageUrl || image || null,
        userId: req.userId,
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        complaintVotes: { select: { userId: true } },
      },
    });

    res.status(201).json(toClientComplaint(complaint, { id: req.userId, role: req.userRole }));

    // Emit real-time notification (fire-and-forget)
    onComplaintCreated(complaint).catch(() => {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all complaints
router.get("/", async (req, res) => {
  try {
    const viewer = decodeViewer(req);

    const complaints = await prisma.complaint.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        complaintVotes: { select: { userId: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(complaints.map((complaint) => toClientComplaint(complaint, viewer)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's complaints
router.get("/user/my-complaints", authMiddleware, async (req, res) => {
  try {
    const complaints = await prisma.complaint.findMany({
      where: { userId: req.userId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        complaintVotes: { select: { userId: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(complaints.map((complaint) => toClientComplaint(complaint, { id: req.userId, role: req.userRole })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:id/vote", authMiddleware, async (req, res) => {
  try {
    const complaintId = parseInt(req.params.id, 10);

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    const alreadyVoted = await prisma.complaintVote.findUnique({
      where: {
        complaintId_userId: {
          complaintId,
          userId: req.userId,
        },
      },
    });

    if (alreadyVoted) {
      return res.status(400).json({ error: "Already voted" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.complaintVote.create({
        data: {
          complaintId,
          userId: req.userId,
        },
      });

      const updatedComplaint = await tx.complaint.update({
        where: { id: complaintId },
        data: { votes: { increment: 1 } },
      });

    });

    let latest = await prisma.complaint.findUnique({
      where: { id: complaintId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        complaintVotes: { select: { userId: true } },
      },
    });

    if (isEligibleForEscalation(latest)) {
      try {
        await prisma.$transaction(async (tx) => {
          await markPostAttempt(tx, complaintId);
        });

        const postResult = await postComplaintToX(latest);

        await prisma.$transaction(async (tx) => {
          await markPostSuccess(tx, complaintId, postResult);
        });

        // Emit escalation notification
        onComplaintEscalated(latest).catch(() => {});
      } catch (error) {
        await prisma.$transaction(async (tx) => {
          await markPostFailure(tx, complaintId, error);
        });
      }

      latest = await prisma.complaint.findUnique({
        where: { id: complaintId },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          complaintVotes: { select: { userId: true } },
        },
      });
    }

    res.json(toClientComplaint(latest, { id: req.userId, role: req.userRole }));

    // Emit real-time vote notification (fire-and-forget)
    onComplaintVoted(latest, req.userId).catch(() => {});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Public Heatmap endpoint (no auth needed) — MUST be before /:id ──────────
router.get("/heatmap", async (req, res) => {
  try {
    const complaints = await prisma.complaint.findMany({
      select: {
        id: true,
        latitude: true,
        longitude: true,
        category: true,
        status: true,
        title: true,
        votes: true,
        address: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get complaint by ID
router.get("/:id", async (req, res) => {
  try {
    const viewer = decodeViewer(req);
    const complaint = await prisma.complaint.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        complaintVotes: { select: { userId: true } },
      },
    });

    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    res.json(toClientComplaint(complaint, viewer));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update complaint
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const complaintId = parseInt(req.params.id);
    const { title, description, category, status, latitude, longitude, address, imageUrl, assignedDepartment } = req.body;

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    if (complaint.userId !== req.userId && req.userRole !== "ADMIN") {
      return res.status(403).json({ error: "Not authorized to update this complaint" });
    }

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(category && { category }),
        ...(status && { status: String(status).toUpperCase() }),
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
        ...(address !== undefined && { address }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(assignedDepartment !== undefined && { assignedDepartment }),
      },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        complaintVotes: { select: { userId: true } },
      },
    });

    res.json(toClientComplaint(updated, { id: req.userId, role: req.userRole }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete complaint
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const complaintId = parseInt(req.params.id);

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
    });

    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    if (complaint.userId !== req.userId && req.userRole !== "ADMIN") {
      return res.status(403).json({ error: "Not authorized to delete this complaint" });
    }

    await prisma.complaint.delete({
      where: { id: complaintId },
    });

    res.json({ message: "Complaint deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.post("/:id/resolve-with-proof", authMiddleware, async (req, res) => {
  try {
    const complaintId = parseInt(req.params.id, 10);
    const { resolutionImageUrl } = req.body;

    if (!resolutionImageUrl) {
      return res.status(400).json({ error: "Resolution proof photo is required" });
    }

    const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) return res.status(404).json({ error: "Complaint not found" });

    // Only assigned subadmin or admin can resolve
    const isAssigned = complaint.assignedAdminId === req.userId;
    const isAdmin    = ["ADMIN", "SUPERADMIN"].includes(req.userRole);
    if (!isAssigned && !isAdmin) {
      return res.status(403).json({ error: "Not authorized to resolve this complaint" });
    }

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolutionImageUrl,
        resolutionChallenged: false,
      },
      include: { user: { select: { id: true, name: true, email: true, phone: true } }, complaintVotes: { select: { userId: true } } },
    });

    // Award 10 reward points to the citizen
    await prisma.user.update({
      where: { id: updated.userId },
      data: { rewardPoints: { increment: 10 } },
    });

    console.log(`[Resolution] ✅ Complaint #${complaintId} resolved with proof by user ${req.userId}`);
    res.json(toClientComplaint(updated, { id: req.userId, role: req.userRole }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Citizen challenges a resolution ──────────────────────────────────────────
router.post("/:id/challenge-resolution", authMiddleware, async (req, res) => {
  try {
    const complaintId = parseInt(req.params.id, 10);
    const { reason } = req.body;

    if (!reason?.trim()) {
      return res.status(400).json({ error: "Please provide a reason for challenging this resolution" });
    }

    const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) return res.status(404).json({ error: "Complaint not found" });

    // Only the original reporter can challenge
    if (complaint.userId !== req.userId) {
      return res.status(403).json({ error: "Only the complaint reporter can challenge a resolution" });
    }

    if (complaint.status !== "RESOLVED") {
      return res.status(400).json({ error: "Can only challenge resolved complaints" });
    }

    if (complaint.resolutionChallenged) {
      return res.status(400).json({ error: "Resolution already challenged" });
    }

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: {
        resolutionChallenged: true,
        resolutionChallengeNote: reason.trim(),
        status: "OPEN", // Re-open it
      },
      include: { user: { select: { id: true, name: true, email: true, phone: true } }, complaintVotes: { select: { userId: true } } },
    });

    console.log(`[Challenge] ⚠️ Complaint #${complaintId} resolution challenged by citizen ${req.userId}`);
    res.json(toClientComplaint(updated, { id: req.userId, role: req.userRole }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

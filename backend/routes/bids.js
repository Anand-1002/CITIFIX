const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authMiddleware, superAdminMiddleware, subAdminMiddleware } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();

// ─── Shared include helper ────────────────────────────────────────────────────
const bidInclude = {
  complaint: { select: { id: true, title: true, category: true, address: true, status: true } },
  createdBy: { select: { id: true, name: true } },
  proposals: {
    include: { subAdmin: { select: { id: true, name: true, phone: true, department: true } } },
    orderBy: { quotedBudget: "asc" },
  },
};

// ─────────────────────────── SUPERADMIN ENDPOINTS ────────────────────────────

// POST /api/bids  — Create a new bid for a complaint
router.post("/", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const { complaintId, title, scope, estimatedBudget, deadline, projectTimeline } = req.body;

    if (!complaintId || !title || !scope || !deadline || !projectTimeline) {
      return res.status(400).json({ error: "complaintId, title, scope, deadline and projectTimeline are required" });
    }

    const complaint = await prisma.complaint.findUnique({ where: { id: parseInt(complaintId, 10) } });
    if (!complaint) return res.status(404).json({ error: "Complaint not found" });

    // Only allow one OPEN bid per complaint
    const existing = await prisma.projectBid.findFirst({
      where: { complaintId: parseInt(complaintId, 10), status: "OPEN" },
    });
    if (existing) return res.status(409).json({ error: "This complaint already has an open bid" });

    const bid = await prisma.projectBid.create({
      data: {
        complaintId: parseInt(complaintId, 10),
        createdById: req.userId,
        department: complaint.category,
        title,
        scope,
        estimatedBudget: estimatedBudget ? parseFloat(estimatedBudget) : null,
        deadline: new Date(deadline),
        projectTimeline: parseInt(projectTimeline, 10),
      },
      include: bidInclude,
    });

    res.status(201).json(bid);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/bids  — List all bids (SuperAdmin)
router.get("/", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const bids = await prisma.projectBid.findMany({
      include: bidInclude,
      orderBy: { createdAt: "desc" },
    });
    res.json(bids);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/bids/:id/proposals  — Get all proposals for a bid (SuperAdmin)
router.get("/:id/proposals", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const bidId = parseInt(req.params.id, 10);
    const proposals = await prisma.bidProposal.findMany({
      where: { bidId },
      include: { subAdmin: { select: { id: true, name: true, phone: true, department: true } } },
      orderBy: { quotedBudget: "asc" },
    });
    res.json(proposals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/bids/:id/award/:proposalId  — Award bid → auto-assign SubAdmin to complaint
router.post("/:id/award/:proposalId", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const bidId = parseInt(req.params.id, 10);
    const proposalId = parseInt(req.params.proposalId, 10);

    const bid = await prisma.projectBid.findUnique({
      where: { id: bidId },
      include: { complaint: true },
    });
    if (!bid) return res.status(404).json({ error: "Bid not found" });
    if (bid.status !== "OPEN") return res.status(400).json({ error: "Bid is no longer open" });

    const proposal = await prisma.bidProposal.findUnique({ where: { id: proposalId } });
    if (!proposal || proposal.bidId !== bidId) return res.status(404).json({ error: "Proposal not found" });

    // Run atomically in a transaction
    const [updatedBid] = await prisma.$transaction([
      // Mark bid as AWARDED
      prisma.projectBid.update({
        where: { id: bidId },
        data: { status: "AWARDED", awardedProposalId: proposalId },
        include: bidInclude,
      }),
      // Mark winning proposal as AWARDED
      prisma.bidProposal.update({
        where: { id: proposalId },
        data: { status: "AWARDED" },
      }),
      // Reject all other proposals for this bid
      prisma.bidProposal.updateMany({
        where: { bidId, id: { not: proposalId } },
        data: { status: "REJECTED" },
      }),
      // Auto-assign SubAdmin to complaint using proposal values
      prisma.complaint.update({
        where: { id: bid.complaintId },
        data: {
          assignedAdminId: proposal.subAdminId,
          assignedAt: new Date(),
          status: "ASSIGNED",
          projectAmount: proposal.quotedBudget,
          projectDeadline: (() => {
            const d = new Date();
            d.setDate(d.getDate() + proposal.proposedDays);
            return d;
          })(),
          slaDeadline: (() => {
            const d = new Date();
            d.setDate(d.getDate() + proposal.proposedDays);
            return d;
          })(),
          slaBreached: false,
          slaBreach: "NONE",
        },
      }),
    ]);

    res.json(updatedBid);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/bids/:id  — Cancel/close a bid
router.delete("/:id", authMiddleware, superAdminMiddleware, async (req, res) => {
  try {
    const bidId = parseInt(req.params.id, 10);
    const bid = await prisma.projectBid.findUnique({ where: { id: bidId } });
    if (!bid) return res.status(404).json({ error: "Bid not found" });
    if (bid.status !== "OPEN") return res.status(400).json({ error: "Only OPEN bids can be cancelled" });

    const updated = await prisma.projectBid.update({
      where: { id: bidId },
      data: { status: "CLOSED" },
      include: bidInclude,
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─────────────────────────── SUBADMIN ENDPOINTS ──────────────────────────────

// GET /api/bids/my-dept  — Get all OPEN bids for this SubAdmin's department
router.get("/my-dept", authMiddleware, subAdminMiddleware, async (req, res) => {
  try {
    const me = await prisma.user.findUnique({ where: { id: req.userId }, select: { department: true } });
    if (!me?.department) return res.json([]);

    const bids = await prisma.projectBid.findMany({
      where: { department: me.department, status: "OPEN" },
      include: {
        complaint: { select: { id: true, title: true, category: true, address: true } },
        createdBy: { select: { id: true, name: true } },
        proposals: {
          where: { subAdminId: req.userId },
          select: { id: true, status: true, quotedBudget: true, proposedDays: true, teamSize: true, approach: true, updatedAt: true },
        },
      },
      orderBy: { deadline: "asc" },
    });

    res.json(bids);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/bids/:id/propose  — Submit or update a proposal for a bid (SubAdmin)
router.post("/:id/propose", authMiddleware, subAdminMiddleware, async (req, res) => {
  try {
    const bidId = parseInt(req.params.id, 10);
    const { quotedBudget, proposedDays, teamSize, approach } = req.body;

    if (!quotedBudget || !proposedDays || !approach) {
      return res.status(400).json({ error: "quotedBudget, proposedDays and approach are required" });
    }

    const bid = await prisma.projectBid.findUnique({ where: { id: bidId } });
    if (!bid) return res.status(404).json({ error: "Bid not found" });
    if (bid.status !== "OPEN") return res.status(400).json({ error: "Bid is no longer accepting proposals" });

    // Verify SubAdmin belongs to this department
    const me = await prisma.user.findUnique({ where: { id: req.userId }, select: { department: true } });
    if (me?.department !== bid.department) {
      return res.status(403).json({ error: "You are not in the department for this bid" });
    }

    // Upsert — allows editing before award
    const existing = await prisma.bidProposal.findUnique({
      where: { bidId_subAdminId: { bidId, subAdminId: req.userId } },
    });

    if (existing && existing.status === "AWARDED") {
      return res.status(400).json({ error: "Your proposal has already been awarded — no changes allowed" });
    }

    const proposal = existing
      ? await prisma.bidProposal.update({
          where: { id: existing.id },
          data: {
            quotedBudget: parseFloat(quotedBudget),
            proposedDays: parseInt(proposedDays, 10),
            teamSize: teamSize ? parseInt(teamSize, 10) : null,
            approach,
            status: "PENDING",
          },
          include: { subAdmin: { select: { id: true, name: true } } },
        })
      : await prisma.bidProposal.create({
          data: {
            bidId,
            subAdminId: req.userId,
            quotedBudget: parseFloat(quotedBudget),
            proposedDays: parseInt(proposedDays, 10),
            teamSize: teamSize ? parseInt(teamSize, 10) : null,
            approach,
          },
          include: { subAdmin: { select: { id: true, name: true } } },
        });

    res.status(201).json(proposal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/bids/:id/my-proposal  — Get this SubAdmin's own proposal for a bid
router.get("/:id/my-proposal", authMiddleware, subAdminMiddleware, async (req, res) => {
  try {
    const bidId = parseInt(req.params.id, 10);
    const proposal = await prisma.bidProposal.findUnique({
      where: { bidId_subAdminId: { bidId, subAdminId: req.userId } },
    });
    res.json(proposal || null);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

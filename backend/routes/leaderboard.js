const express = require("express");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient();

// Get leaderboard - top users by reward points
router.get("/", async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        rewardPoints: true,
        _count: {
          select: { complaints: true },
        },
      },
      orderBy: {
        rewardPoints: "desc",
      },
      take: 100,
    });

    const leaderboard = users.map((user, index) => ({
      rank: index + 1,
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      rewardPoints: user.rewardPoints,
      complaintCount: user._count.complaints,
    }));

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

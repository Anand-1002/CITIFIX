const cron = require("node-cron");
const { PrismaClient } = require("@prisma/client");
const {
  isEligibleForEscalation,
  postComplaintToTelegram,
  markPostAttempt,
  markPostSuccess,
  markPostFailure,
} = require("../services/telegramEscalationService");
const { sendEscalationEmail, sendSlaBreachReminder } = require("../services/emailService");

const prisma = new PrismaClient();

const runEscalationSweep = async () => {
  const candidates = await prisma.complaint.findMany({
    where: {
      tweetPosted: false,
      votes: {
        gte: parseInt(process.env.ESCALATION_THRESHOLD || "50", 10),
      },
      status: {
        not: "RESOLVED",
      },
    },
    orderBy: { createdAt: "asc" },
  });

  for (const complaint of candidates) {
    if (!isEligibleForEscalation(complaint)) {
      continue;
    }

    try {
      await prisma.$transaction(async (tx) => {
        await markPostAttempt(tx, complaint.id);
      });

      // 1️⃣  Post to Telegram channel
      const result = await postComplaintToTelegram(complaint);

      await prisma.$transaction(async (tx) => {
        await markPostSuccess(tx, complaint.id, result);
      });

      // 2️⃣  Send structured email to the responsible govt. department
      sendEscalationEmail(complaint).catch((emailErr) => {
        console.error(`[Email] Failed for complaint #${complaint.id}:`, emailErr.message);
      });

    } catch (error) {
      console.error(`[Scheduler] Escalation failed for complaint #${complaint.id}:`, error.message);
      await prisma.$transaction(async (tx) => {
        await markPostFailure(tx, complaint.id, error);
      });
    }
  }
};

const runSlaBreachSweep = async () => {
  const breached = await prisma.complaint.findMany({
    where: {
      status: "ASSIGNED",
      slaBreached: false,
      slaDeadline: { lte: new Date() }
    },
    include: {
      assignedAdmin: { select: { email: true, name: true } }
    }
  });

  for (const complaint of breached) {
    try {
      // 1. Update DB
      await prisma.complaint.update({
        where: { id: complaint.id },
        data: {
          slaBreached: true,
          slaBreach: "ESCALATED",
          status: "ESCALATED",
          escalatedAt: new Date()
        }
      });

      // 2. Telegram
      await postComplaintToTelegram(complaint).catch(() => {});

      // 3. Dept Email
      sendEscalationEmail(complaint).catch(() => {});

      // 4. SubAdmin Reminder Email
      if (complaint.assignedAdmin?.email) {
        sendSlaBreachReminder(complaint, complaint.assignedAdmin.email, complaint.assignedAdmin.name).catch(() => {});
      }

    } catch (e) {
      console.error(`[Scheduler] SLA breach sweep failed for #${complaint.id}:`, e.message);
    }
  }
};

const startEscalationScheduler = () => {
  const cronExpression = process.env.ESCALATION_CRON || "0 * * * *";

  // Startup catch-up prevents missing escalations during downtime.
  runEscalationSweep().catch(() => {});
  runSlaBreachSweep().catch(() => {});

  cron.schedule(cronExpression, () => {
    runEscalationSweep().catch(() => {});
    runSlaBreachSweep().catch(() => {});
  });
};

module.exports = {
  startEscalationScheduler,
  runEscalationSweep,
  runSlaBreachSweep,
};

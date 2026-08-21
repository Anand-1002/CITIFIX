require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { sendEscalationEmail } = require("./services/emailService");
const prisma = new PrismaClient();

async function run() {
  const complaint = await prisma.complaint.findFirst({
    where: { status: { not: "RESOLVED" } },
  });

  if (!complaint) {
    console.log("No open complaint found in DB.");
    await prisma.$disconnect();
    return;
  }

  console.log(`Using complaint #${complaint.id} — "${complaint.title}" (${complaint.category})`);
  await sendEscalationEmail(complaint);
  await prisma.$disconnect();
}

run().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});

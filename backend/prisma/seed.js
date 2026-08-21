const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding demo accounts...\n");

  const demoUsers = [
    {
      name: "Super Admin (Demo)",
      phone: "+910000000001",
      role: "SUPERADMIN",
      email: "superadmin@citifix.demo",
    },
    {
      name: "Sub Admin (Demo)",
      phone: "+910000000002",
      role: "SUBADMIN",
      email: "subadmin@citifix.demo",
      department: "ROADS",
    },
    {
      name: "Citizen (Demo)",
      phone: "+910000000003",
      role: "CITIZEN",
      email: "citizen@citifix.demo",
    },
    {
      name: "Citizen Demo 2",
      phone: "+910000000004",
      role: "CITIZEN",
      email: "citizen2@citifix.demo",
    },
    {
      name: "Citizen Demo 3",
      phone: "+910000000005",
      role: "CITIZEN",
      email: "citizen3@citifix.demo",
    },
    {
      name: "Citizen Demo 4",
      phone: "+910000000006",
      role: "CITIZEN",
      email: "citizen4@citifix.demo",
    },
    {
      name: "Citizen Demo 5",
      phone: "+910000000007",
      role: "CITIZEN",
      email: "citizen5@citifix.demo",
    },
    {
      name: "Citizen Demo 6",
      phone: "+910000000008",
      role: "CITIZEN",
      email: "citizen6@citifix.demo",
    },
    {
      name: "Citizen Demo 7",
      phone: "+910000000009",
      role: "CITIZEN",
      email: "citizen7@citifix.demo",
    },
    {
      name: "Citizen Demo 8",
      phone: "+910000000010",
      role: "CITIZEN",
      email: "citizen8@citifix.demo",
    },
    {
      name: "Citizen Demo 9",
      phone: "+910000000011",
      role: "CITIZEN",
      email: "citizen9@citifix.demo",
    },
    {
      name: "Citizen Demo 10",
      phone: "+910000000012",
      role: "CITIZEN",
      email: "citizen10@citifix.demo",
    },
    {
      name: "Citizen Demo 11",
      phone: "+910000000013",
      role: "CITIZEN",
      email: "citizen11@citifix.demo",
    },
  ];

  for (const userData of demoUsers) {
    const user = await prisma.user.upsert({
      where: { phone: userData.phone },
      update: {
        name: userData.name,
        role: userData.role,
        department: userData.department || null,
        email: userData.email,
      },
      create: {
        name: userData.name,
        phone: userData.phone,
        role: userData.role,
        email: userData.email,
        department: userData.department || null,
        rewardPoints: 0,
      },
    });

    console.log(`✅ ${userData.role.padEnd(12)} → Phone: ${userData.phone}  |  ID: ${user.id}  |  Name: ${user.name}`);
  }

  console.log("\n🔑 Demo OTP for all accounts: 123456");
  console.log("\n📋 Login Credentials:");
  console.log("─────────────────────────────────────────────────");
  console.log("  SUPERADMIN  │ Phone: 0000000001  │ OTP: 123456");
  console.log("  SUBADMIN    │ Phone: 0000000002  │ OTP: 123456");
  console.log("  CITIZEN 1   │ Phone: 0000000003  │ OTP: 123456");
  console.log("  CITIZEN 2   │ Phone: 0000000004  │ OTP: 123456");
  console.log("  CITIZEN 3   │ Phone: 0000000005  │ OTP: 123456");
  console.log("  CITIZEN 4   │ Phone: 0000000006  │ OTP: 123456");
  console.log("  CITIZEN 5   │ Phone: 0000000007  │ OTP: 123456");
  console.log("  CITIZEN 6   │ Phone: 0000000008  │ OTP: 123456");
  console.log("  CITIZEN 7   │ Phone: 0000000009  │ OTP: 123456");
  console.log("  CITIZEN 8   │ Phone: 0000000010  │ OTP: 123456");
  console.log("  CITIZEN 9   │ Phone: 0000000011  │ OTP: 123456");
  console.log("  CITIZEN 10  │ Phone: 0000000012  │ OTP: 123456");
  console.log("  CITIZEN 11  │ Phone: 0000000013  │ OTP: 123456");
  console.log("─────────────────────────────────────────────────\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

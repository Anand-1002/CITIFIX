require("dotenv").config();
const nodemailer = require("nodemailer");

const TEST_RECIPIENT = "shuvamd172@gmail.com";

async function testSmtp() {
  console.log("─────────────────────────────────────");
  console.log("  CitiFix SMTP Test");
  console.log("─────────────────────────────────────");
  console.log(`  Host    : ${process.env.SMTP_HOST}`);
  console.log(`  Port    : ${process.env.SMTP_PORT}`);
  console.log(`  User    : ${process.env.SMTP_USER}`);
  console.log(`  From    : ${process.env.SMTP_FROM_EMAIL}`);
  console.log(`  To      : ${TEST_RECIPIENT}`);
  console.log("─────────────────────────────────────");

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: parseInt(process.env.SMTP_PORT || "587", 10) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
  });

  // Verify connection first
  console.log("\n[1/2] Verifying SMTP connection...");
  await transporter.verify();
  console.log("      ✅ SMTP connection verified!\n");

  // Send test email
  console.log("[2/2] Sending test email...");
  const info = await transporter.sendMail({
    from: `"CitiFix Platform" <${process.env.SMTP_FROM_EMAIL}>`,
    to: TEST_RECIPIENT,
    subject: "✅ CitiFix SMTP Test — Email Delivery Confirmed",
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:32px auto;background:#f9f9f9;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
        <div style="background:#1a3c6e;padding:24px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:20px;">🏛️ CitiFix SMTP Test</h1>
        </div>
        <div style="padding:28px;">
          <h2 style="color:#1a7a4a;margin-top:0;">✅ Email Delivery Working!</h2>
          <p style="color:#333;line-height:1.7;">
            Your SMTP configuration is correctly set up. CitiFix can now send
            automated escalation emails to government departments whenever a
            public complaint is escalated.
          </p>
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:16px;">
            <tr style="border-bottom:1px solid #eee;">
              <td style="padding:8px;font-weight:bold;color:#555;background:#f5f5f5;width:35%;">SMTP Host</td>
              <td style="padding:8px;">${process.env.SMTP_HOST}</td>
            </tr>
            <tr style="border-bottom:1px solid #eee;">
              <td style="padding:8px;font-weight:bold;color:#555;background:#f5f5f5;">Port</td>
              <td style="padding:8px;">${process.env.SMTP_PORT}</td>
            </tr>
            <tr>
              <td style="padding:8px;font-weight:bold;color:#555;background:#f5f5f5;">Sent From</td>
              <td style="padding:8px;">${process.env.SMTP_FROM_EMAIL}</td>
            </tr>
          </table>
          <p style="margin-top:24px;font-size:12px;color:#999;">
            This is an automated test message from the CitiFix platform.
          </p>
        </div>
      </div>
    `,
    text: `CitiFix SMTP Test\n\n✅ Email delivery is working!\n\nSMTP Host: ${process.env.SMTP_HOST}\nPort: ${process.env.SMTP_PORT}\nFrom: ${process.env.SMTP_FROM_EMAIL}\n\nThis is a test message from CitiFix.`,
  });

  console.log(`      ✅ Email sent! Message ID: ${info.messageId}`);
  console.log(`\n🎉 All good! Check inbox at: ${TEST_RECIPIENT}`);
}

testSmtp().catch((err) => {
  console.error("\n❌ SMTP Test FAILED:");
  console.error("   ", err.message);
  console.error("\nCommon fixes:");
  console.error("   • Make sure 2-Step Verification is ON in your Google Account");
  console.error("   • Make sure you're using an App Password (not your real password)");
  console.error("   • Check SMTP_USER and SMTP_PASS in .env are correct");
  process.exit(1);
});

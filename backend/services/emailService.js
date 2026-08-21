const nodemailer = require("nodemailer");

// ─── Department → .env key mapping ───────────────────────────────────────────
const DEPT_EMAIL_ENV_MAP = {
  Roads:       "DEPT_EMAIL_ROADS",
  Water:       "DEPT_EMAIL_WATER",
  Waste:       "DEPT_EMAIL_WASTE",
  Electricity: "DEPT_EMAIL_ELECTRICITY",
  Parks:       "DEPT_EMAIL_PARKS",
  Traffic:     "DEPT_EMAIL_TRAFFIC",
  Other:       "DEPT_EMAIL_OTHER",
};

const DEPT_FULL_NAME = {
  Roads:       "Roads & Infrastructure Department",
  Water:       "Water Supply & Sanitation Department",
  Waste:       "Solid Waste Management Department",
  Electricity: "Electricity & Power Department",
  Parks:       "Parks, Horticulture & Gardens Department",
  Traffic:     "Traffic Police & Road Safety Department",
  Other:       "Public Grievance Cell",
};

// ─── SMTP transporter (lazy-created) ─────────────────────────────────────────
const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP credentials are not configured (SMTP_HOST, SMTP_USER, SMTP_PASS)");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for 587/25
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
};

// ─── HTML email body ──────────────────────────────────────────────────────────
const buildEmailHtml = (complaint) => {
  const deptName = DEPT_FULL_NAME[complaint.category] || DEPT_FULL_NAME.Other;
  const reportedOn = new Date(complaint.createdAt).toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });
  const ageMs = Date.now() - new Date(complaint.createdAt).getTime();
  const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
  const mapsUrl = `https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}`;

  const hasImage = !!complaint.imageUrl;
  const imageSection = hasImage
    ? `<tr>
        <td>Complaint Photo</td>
        <td><img src="cid:complaint_image" alt="Complaint Photo" style="max-width:100%;border-radius:4px;margin-top:6px;" /></td>
       </tr>`
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CitiFix Escalation Notice</title>
  <style>
    body { margin: 0; padding: 0; background: #f5f5f5; font-family: 'Georgia', serif; color: #1a1a1a; }
    .wrapper { max-width: 680px; margin: 32px auto; background: #ffffff; border: 1px solid #d0d0d0; border-radius: 4px; overflow: hidden; }
    .header { background: #1a3c6e; padding: 24px 32px; text-align: center; }
    .header img { height: 36px; margin-bottom: 10px; }
    .header h1 { color: #ffffff; font-size: 20px; margin: 0; letter-spacing: 0.5px; }
    .header p { color: #a8c4e8; font-size: 13px; margin: 4px 0 0; }
    .alert-banner { background: #d93025; color: #fff; text-align: center; padding: 10px; font-size: 13px; font-weight: bold; letter-spacing: 0.3px; }
    .body { padding: 32px; }
    .address-block { font-size: 14px; line-height: 1.8; margin-bottom: 24px; }
    .subject { font-size: 15px; font-weight: bold; margin-bottom: 6px; }
    .subject span { text-decoration: underline; }
    .salutation { margin: 20px 0 12px; font-size: 14px; }
    .intro { font-size: 14px; line-height: 1.8; margin-bottom: 20px; }
    .details-table { width: 100%; border-collapse: collapse; font-size: 13.5px; margin: 20px 0; }
    .details-table tr { border-bottom: 1px solid #ebebeb; }
    .details-table td { padding: 9px 12px; vertical-align: top; }
    .details-table td:first-child { font-weight: bold; color: #444; width: 38%; background: #f9f9f9; }
    .badge { display: inline-block; background: #d93025; color: #fff; border-radius: 12px; padding: 2px 10px; font-size: 12px; font-weight: bold; }
    .badge-open { background: #e67e22; }
    .badge-escalated { background: #c0392b; }
    .cta-box { background: #eef3fb; border: 1px solid #aac4e8; border-radius: 6px; padding: 16px 20px; margin: 24px 0; font-size: 13.5px; line-height: 1.7; }
    .closing { font-size: 14px; line-height: 1.8; margin-top: 24px; }
    .sig { margin-top: 24px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 13px; color: #555; }
    .footer { background: #f0f0f0; padding: 16px 32px; font-size: 12px; color: #888; text-align: center; border-top: 1px solid #ddd; }
    a { color: #1a3c6e; }
  </style>
</head>
<body>
<div class="wrapper">
  <!-- Header -->
  <div class="header">
    <h1>🏛️ CitiFix — Civic Escalation Notice</h1>
    <p>Automated Public Grievance Escalation System | India</p>
  </div>

  <!-- Alert Banner -->
  <div class="alert-banner">
    ⚠️ UNRESOLVED PUBLIC COMPLAINT — REQUIRES IMMEDIATE DEPARTMENTAL ACTION
  </div>

  <!-- Body -->
  <div class="body">
    <div class="address-block">
      <strong>To,</strong><br/>
      The Concerned Officer,<br/>
      <strong>${deptName},</strong><br/>
      Municipal Corporation / State Authority<br/>
      Government of India
    </div>

    <div class="subject">
      <strong>Sub:</strong> <span>Public Complaint Requiring Urgent Redressal — CitiFix Reference #${complaint.id}</span>
    </div>

    <div class="salutation">Dear Sir / Madam,</div>

    <div class="intro">
      This notice is being issued by the <strong>CitiFix Civic Issue Tracking Platform</strong> to
      bring to your kind attention a public complaint filed by a citizen that has received
      significant community support (<strong>${complaint.votes} upvotes</strong>) and has remained
      unresolved for <strong>${ageDays} day${ageDays !== 1 ? "s" : ""}</strong>.
      <br/><br/>
      As per citizen charter norms and the Right of Citizens for Time Bound Delivery of Goods and
      Services Act, we request your department to initiate prompt redressal of the grievance
      mentioned below:
    </div>

    <!-- Details Table -->
    <table class="details-table">
      <tr><td>CitiFix Reference No.</td><td><strong>#${complaint.id}</strong></td></tr>
      <tr><td>Complaint Title</td><td><strong>${complaint.title}</strong></td></tr>
      <tr><td>Department / Category</td><td>${complaint.category || "General"}</td></tr>
      <tr><td>Reported On</td><td>${reportedOn}</td></tr>
      <tr><td>Pending Since</td><td><strong>${ageDays} day${ageDays !== 1 ? "s" : ""}</strong></td></tr>
      <tr><td>Location / Address</td><td>${complaint.address || "Not specified"}</td></tr>
      <tr><td>Coordinates (GPS)</td><td><a href="${mapsUrl}" target="_blank">${complaint.latitude}, ${complaint.longitude} — View on Map</a></td></tr>
      <tr><td>Current Status</td><td><span class="badge badge-${(complaint.status || "").toLowerCase()}">${(complaint.status || "Open").toUpperCase()}</span></td></tr>
      <tr><td>Community Upvotes</td><td><strong>${complaint.votes}</strong> citizens have supported this complaint</td></tr>
      <tr>
        <td>Description</td>
        <td style="line-height:1.7">${complaint.description || "—"}</td>
      </tr>
      ${complaint.assignedDepartment ? `<tr><td>Assigned To</td><td>${complaint.assignedDepartment}</td></tr>` : ""}
      ${imageSection}
    </table>

    <div class="cta-box">
      <strong>Action Required:</strong><br/>
      Kindly acknowledge receipt of this notice and initiate the appropriate field inspection and
      remedial action at the earliest. Citizens are actively monitoring this issue on the CitiFix
      platform and expect timely resolution.
    </div>

    <div class="closing">
      We trust that your department will accord priority to this matter in keeping with the
      Government of India's commitment to citizen-centric governance.<br/><br/>
      Thanking you,
    </div>

    <div class="sig">
      <strong>CitiFix Automated Escalation System</strong><br/>
      AI-powered Civic Issue Tracking Platform<br/>
      Email: ${process.env.SMTP_FROM_EMAIL || "citifix@platform.in"}<br/>
      <em>This is a system-generated notification. Please do not reply to this email directly.</em>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    © CitiFix Platform &nbsp;|&nbsp; Empowering Citizens, Transforming Cities<br/>
    This email was sent automatically by CitiFix as part of its civic complaint escalation workflow.
  </div>
</div>
</body>
</html>
  `.trim();
};

// ─── Plain-text fallback ──────────────────────────────────────────────────────
const buildEmailText = (complaint) => {
  const deptName = DEPT_FULL_NAME[complaint.category] || DEPT_FULL_NAME.Other;
  const reportedOn = new Date(complaint.createdAt).toLocaleDateString("en-IN");
  const ageDays = Math.floor((Date.now() - new Date(complaint.createdAt).getTime()) / 86400000);

  return [
    "CITIFIX — CIVIC ESCALATION NOTICE",
    "==================================",
    "",
    `To,`,
    `The Concerned Officer,`,
    `${deptName},`,
    `Municipal Corporation / State Authority`,
    "",
    `Sub: Public Complaint Requiring Urgent Redressal — CitiFix Ref. #${complaint.id}`,
    "",
    "Dear Sir/Madam,",
    "",
    `This notice is to bring to your attention a public complaint that has received ${complaint.votes} community upvotes and remains unresolved for ${ageDays} day(s).`,
    "",
    "COMPLAINT DETAILS",
    "-----------------",
    `Reference No. : #${complaint.id}`,
    `Title         : ${complaint.title}`,
    `Category      : ${complaint.category}`,
    `Reported On   : ${reportedOn}`,
    `Pending Since : ${ageDays} day(s)`,
    `Location      : ${complaint.address || "Not specified"}`,
    `GPS           : ${complaint.latitude}, ${complaint.longitude}`,
    `Status        : ${complaint.status}`,
    `Upvotes       : ${complaint.votes}`,
    `Description   : ${complaint.description}`,
    "",
    "Kindly take immediate action and update the status on the CitiFix platform.",
    "",
    "Regards,",
    "CitiFix Automated Escalation System",
  ].join("\n");
};

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Send a formal escalation email to the government department
 * responsible for the complaint's category.
 *
 * @param {object} complaint  - Prisma Complaint object
 * @returns {Promise<void>}
 */
const sendEscalationEmail = async (complaint) => {
  const testOverride = process.env.TEST_EMAIL_OVERRIDE;

  // Determine the real department recipient
  const envKey = DEPT_EMAIL_ENV_MAP[complaint.category] || "DEPT_EMAIL_OTHER";
  const deptEmail = process.env[envKey];

  if (!deptEmail && !testOverride) {
    console.warn(
      `[Email] No recipient configured for category "${complaint.category}" (${envKey} is not set). Skipping.`
    );
    return;
  }

  // In test mode, override destination — still show what the real dept would be
  const recipientEmail = testOverride || deptEmail;
  const isTestMode = !!testOverride;

  const transporter = getTransporter();

  const subject = isTestMode
    ? `[TEST] [CitiFix Alert #${complaint.id}] ${complaint.category || "Civic"} Issue — Would send to: ${deptEmail || "not configured"}`
    : `[CitiFix Alert #${complaint.id}] ${complaint.category || "Civic"} Issue — Urgent Public Complaint Requires Redressal`;

  // ── Build attachments for the complaint image ──────────────────────────────
  const attachments = [];
  const imageUrl = complaint.imageUrl || null;

  if (imageUrl) {
    if (imageUrl.startsWith("data:")) {
      // Base64 data URL → inline Buffer attachment
      const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const ext      = mimeType.split("/")[1] || "jpg";
        attachments.push({
          filename:    `complaint_${complaint.id}.${ext}`,
          content:     Buffer.from(matches[2], "base64"),
          contentType: mimeType,
          cid:         "complaint_image",   // referenced in HTML via cid:
        });
      }
    } else if (imageUrl.startsWith("http")) {
      // Remote URL → nodemailer can fetch it
      attachments.push({
        filename: `complaint_${complaint.id}.jpg`,
        path:     imageUrl,
        cid:      "complaint_image",
      });
    }
  }

  await transporter.sendMail({
    from:        `"CitiFix Platform" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    to:          recipientEmail,
    subject,
    text:        buildEmailText(complaint),
    html:        buildEmailHtml(complaint),
    attachments,
  });

  if (isTestMode) {
    console.log(`[Email] 🧪 TEST MODE — email sent to ${recipientEmail} (real dept: ${deptEmail || envKey + " not set"}) for complaint #${complaint.id}`);
  } else {
    console.log(`[Email] ✅ Escalation email sent to ${recipientEmail} for complaint #${complaint.id}`);
  }
};

const sendSlaBreachReminder = async (complaint, subAdminEmail, subAdminName) => {
  const testOverride = process.env.TEST_EMAIL_OVERRIDE;
  const recipientEmail = testOverride || subAdminEmail;

  if (!recipientEmail) return;

  const transporter = getTransporter();
  const subject = `[URGENT] SLA Breached for Assigned Complaint #${complaint.id}`;

  const text = `Dear ${subAdminName},\n\nThe SLA deadline for your assigned complaint #${complaint.id} ("${complaint.title}") has expired.\n\nPlease take immediate action to resolve this issue to avoid further escalation.\n\nRegards,\nCitiFix System`;

  await transporter.sendMail({
    from: `"CitiFix Platform" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    to: recipientEmail,
    subject,
    text,
  });

  console.log(`[Email] ⏱️ SLA breach reminder sent to ${recipientEmail} for complaint #${complaint.id}`);
};

module.exports = { sendEscalationEmail, sendSlaBreachReminder };

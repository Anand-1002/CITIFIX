const https = require("https");
const FormData = require("form-data");

const DAYS_TO_ESCALATE = parseInt(process.env.ESCALATION_DAYS || "10", 10);
const MIN_SUPPORTERS   = parseInt(process.env.ESCALATION_THRESHOLD || "50", 10);
const MAX_RETRIES      = parseInt(process.env.X_MAX_POST_RETRIES || "5", 10);

// ─── Eligibility check (same logic as xEscalationService) ────────────────────

const isEligibleForEscalation = (complaint) => {
  if (!complaint || complaint.tweetPosted) return false;
  if (complaint.votes < MIN_SUPPORTERS) return false;
  if (complaint.status === "RESOLVED" || complaint.resolvedAt) return false;
  if ((complaint.xPostAttempts || 0) >= MAX_RETRIES) return false;

  // When ESCALATION_DAYS=0, skip age check (useful for testing)
  if (DAYS_TO_ESCALATE === 0) return true;

  const ageMs = Date.now() - new Date(complaint.createdAt).getTime();
  const requiredAgeMs = DAYS_TO_ESCALATE * 24 * 60 * 60 * 1000;
  return ageMs >= requiredAgeMs;
};

// ─── Message builder ──────────────────────────────────────────────────────────

const buildEscalationMessage = (complaint) => {
  const rawDesc = String(complaint.description || "").trim();
  const shortDesc = rawDesc.length > 200 ? rawDesc.slice(0, 197) + "..." : rawDesc;

  const urgencyLine =
    DAYS_TO_ESCALATE > 0
      ? `🚨 Unresolved for ${DAYS_TO_ESCALATE}+ days — community demands action!`
      : `🚨 Community-backed civic complaint needs urgent attention!`;

  const lines = [
    `⚠️ <b>CitiFix Escalation Alert</b>`,
    ``,
    `<b>${escapeHtml(complaint.title)}</b>`,
    ``,
    escapeHtml(shortDesc),
    ``,
    complaint.address ? `📍 <b>Location:</b> ${escapeHtml(complaint.address)}` : null,
    `📂 <b>Category:</b> ${escapeHtml(complaint.category || "General")}`,
    `👥 <b>Community Supporters:</b> ${complaint.votes}`,
    ``,
    urgencyLine,
    ``,
    `#CitiFix #CivicAction #${escapeHashtag(complaint.category || "CivicIssue")} #${escapeHashtag(complaint.address || "LocalIssue")}`,
  ].filter((line) => line !== null);

  return lines.join("\n");
};

// Escape special chars for Telegram HTML
const escapeHtml = (text) =>
  String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const escapeHashtag = (text) =>
  String(text || "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => (i === 0 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join("");

// ─── Telegram HTTP sender (JSON) ─────────────────────────────────────────────

const telegramRequest = (method, body) =>
  new Promise((resolve, reject) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return reject(new Error("TELEGRAM_BOT_TOKEN is not set"));

    const payload = JSON.stringify(body);
    const options = {
      hostname: "api.telegram.org",
      path: `/bot${token}/${method}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (!parsed.ok) {
            return reject(
              new Error(`Telegram API error: ${parsed.description || JSON.stringify(parsed)}`)
            );
          }
          resolve(parsed);
        } catch {
          reject(new Error(`Failed to parse Telegram response: ${data}`));
        }
      });
    });

    req.on("error", reject);
    req.write(payload);
    req.end();
  });

// ─── Telegram multipart sender (for Buffer/file uploads) ──────────────────────

const telegramRequestMultipart = (method, form) =>
  new Promise((resolve, reject) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return reject(new Error("TELEGRAM_BOT_TOKEN is not set"));

    const options = {
      hostname: "api.telegram.org",
      path: `/bot${token}/${method}`,
      method: "POST",
      headers: form.getHeaders(),
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (!parsed.ok) {
            return reject(
              new Error(`Telegram API error: ${parsed.description || JSON.stringify(parsed)}`)
            );
          }
          resolve(parsed);
        } catch {
          reject(new Error(`Failed to parse Telegram response: ${data}`));
        }
      });
    });

    req.on("error", reject);
    form.pipe(req);
  });

// ─── Main post function ───────────────────────────────────────────────────────

const postComplaintToTelegram = async (complaint) => {
  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  if (!channelId) throw new Error("TELEGRAM_CHANNEL_ID is not set");
  if (!process.env.TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN is not set");

  const text = buildEscalationMessage(complaint);
  const imageUrl = complaint.imageUrl || complaint.image || null;

  let result;

  if (imageUrl) {
    try {
      if (imageUrl.startsWith("data:")) {
        // ── Base64 data URL → multipart upload ──
        const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) throw new Error("Invalid data URL format");
        const mimeType = matches[1];  // e.g. image/jpeg
        const buffer   = Buffer.from(matches[2], "base64");
        const ext      = mimeType.split("/")[1] || "jpg";

        const form = new FormData();
        form.append("chat_id",    channelId);
        form.append("caption",    text);
        form.append("parse_mode", "HTML");
        form.append("photo",      buffer, {
          filename:    `complaint_${complaint.id}.${ext}`,
          contentType: mimeType,
        });

        result = await telegramRequestMultipart("sendPhoto", form);
        console.log(`[Telegram] ✅ Photo (base64) sent to ${channelId}`);
      } else {
        // ── Regular http/https URL ──
        result = await telegramRequest("sendPhoto", {
          chat_id:    channelId,
          photo:      imageUrl,
          caption:    text,
          parse_mode: "HTML",
        });
        console.log(`[Telegram] ✅ Photo (URL) sent to ${channelId}`);
      }
    } catch (imgErr) {
      // Fall back to text-only if photo fails
      console.warn(`[Telegram] Photo failed (${imgErr.message}), sending text-only`);
      result = await telegramRequest("sendMessage", {
        chat_id:    channelId,
        text,
        parse_mode: "HTML",
      });
      console.log(`[Telegram] ✅ Text message sent to ${channelId}`);
    }
  } else {
    result = await telegramRequest("sendMessage", {
      chat_id:    channelId,
      text,
      parse_mode: "HTML",
    });
    console.log(`[Telegram] ✅ Text message sent to ${channelId}`);
  }

  const messageId = result?.result?.message_id;
  const chatUsername = result?.result?.chat?.username;
  const postUrl = chatUsername
    ? `https://t.me/${chatUsername.replace("@", "")}/${messageId}`
    : `https://t.me/c/${String(channelId).replace("-100", "")}/${messageId}`;

  return {
    tweetId:  String(messageId),
    tweetUrl: postUrl,
  };
};

// ─── DB helpers (identical interface to xEscalationService) ───────────────────

const markPostAttempt = async (tx, complaintId) =>
  tx.complaint.update({
    where: { id: complaintId },
    data: {
      xPostAttempts: { increment: 1 },
      lastXPostAttemptAt: new Date(),
      xPostError: null,
    },
  });

const markPostSuccess = async (tx, complaintId, postResult) =>
  tx.complaint.update({
    where: { id: complaintId },
    data: {
      tweetPosted:  true,
      status:       "ESCALATED",
      escalatedAt:  new Date(),
      xPostStatus:  "SENT",
      xPostId:      postResult.tweetId,
      xPostUrl:     postResult.tweetUrl,
      xPostError:   null,
    },
  });

const markPostFailure = async (tx, complaintId, error) => {
  const message = String(error?.message || "Telegram posting failed").slice(0, 400);
  return tx.complaint.update({
    where: { id: complaintId },
    data: { xPostStatus: "FAILED", xPostError: message },
  });
};

module.exports = {
  DAYS_TO_ESCALATE,
  MIN_SUPPORTERS,
  MAX_RETRIES,
  isEligibleForEscalation,
  buildEscalationMessage,
  postComplaintToTelegram,
  markPostAttempt,
  markPostSuccess,
  markPostFailure,
};

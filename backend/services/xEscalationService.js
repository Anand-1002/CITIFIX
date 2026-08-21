const { TwitterApi } = require("twitter-api-v2");
const https = require("https");
const http = require("http");

const DAYS_TO_ESCALATE = parseInt(process.env.ESCALATION_DAYS || "10", 10);
const MIN_SUPPORTERS = parseInt(process.env.ESCALATION_THRESHOLD || "50", 10);
const MAX_RETRIES = parseInt(process.env.X_MAX_POST_RETRIES || "5", 10);

// ─── Hashtag helpers ─────────────────────────────────────────────────────────

const toHashtag = (value) =>
  String(value || "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((chunk, index) =>
      index === 0 ? chunk : chunk.charAt(0).toUpperCase() + chunk.slice(1)
    )
    .join("");

const getConfiguredHashtags = () =>
  String(process.env.X_DEFAULT_HASHTAGS || "CitiFix,CivicAction")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => `#${toHashtag(tag.replace(/^#/, ""))}`);

const buildHashtags = (complaint) => {
  const categoryTag = toHashtag(complaint.category || "CivicIssue");
  const locationTag = toHashtag(complaint.address || "LocalIssue");
  const tags = new Set([
    ...getConfiguredHashtags(),
    `#${categoryTag}`,
    `#${locationTag}`,
  ]);
  return Array.from(tags).filter((tag) => tag.length > 1);
};

// ─── Twitter client ───────────────────────────────────────────────────────────

const getTwitterClient = () => {
  const appKey = process.env.X_API_KEY;
  const appSecret = process.env.X_API_KEY_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_TOKEN_SECRET;

  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    return null;
  }

  return new TwitterApi({ appKey, appSecret, accessToken, accessSecret });
};

// ─── Eligibility check ────────────────────────────────────────────────────────

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

// ─── Tweet text builder ───────────────────────────────────────────────────────

const buildEscalationText = (complaint) => {
  const hashtags = buildHashtags(complaint).join(" ");

  // Truncate description to keep tweet within 280 chars
  const rawDesc = String(complaint.description || "").trim();
  const shortDesc =
    rawDesc.length > 120 ? rawDesc.slice(0, 117) + "..." : rawDesc;

  const urgencyLine =
    DAYS_TO_ESCALATE > 0
      ? `🚨 Unresolved for ${DAYS_TO_ESCALATE}+ days — community is calling for action!`
      : `🚨 Community-backed civic complaint needs urgent attention!`;

  const lines = [
    `⚠️ CitiFix Alert: ${complaint.title}`,
    ``,
    shortDesc,
    ``,
    complaint.address ? `📍 Location: ${complaint.address}` : null,
    `📂 Category: ${complaint.category || "General"}`,
    `👥 Supporters: ${complaint.votes}`,
    ``,
    urgencyLine,
    ``,
    hashtags,
  ].filter((line) => line !== null);

  return lines.join("\n").slice(0, 275);
};

// ─── Image downloader ─────────────────────────────────────────────────────────

const downloadImageBuffer = (url) =>
  new Promise((resolve, reject) => {
    if (!url || typeof url !== "string") {
      return reject(new Error("No image URL"));
    }

    const protocol = url.startsWith("https") ? https : http;

    protocol
      .get(url, (res) => {
        // Follow redirects (up to 3)
        if (
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          return downloadImageBuffer(res.headers.location)
            .then(resolve)
            .catch(reject);
        }

        if (res.statusCode !== 200) {
          return reject(
            new Error(`Image download failed: HTTP ${res.statusCode}`)
          );
        }

        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      })
      .on("error", reject);
  });

// ─── Detect MIME type from URL ────────────────────────────────────────────────

const getMimeType = (url) => {
  const lower = String(url || "").toLowerCase();
  if (lower.includes(".png")) return "image/png";
  if (lower.includes(".gif")) return "image/gif";
  if (lower.includes(".webp")) return "image/webp";
  return "image/jpeg"; // default
};

// ─── Main post function ───────────────────────────────────────────────────────

const postComplaintToX = async (complaint) => {
  const client = getTwitterClient();
  if (!client) {
    throw new Error("X API credentials are missing");
  }

  const tweetText = buildEscalationText(complaint);
  let response;

  // Try to attach the complaint image
  const imageUrl = complaint.imageUrl || complaint.image || null;
  if (imageUrl) {
    try {
      console.log(`[X] Downloading complaint image: ${imageUrl}`);
      const imageBuffer = await downloadImageBuffer(imageUrl);
      const mimeType = getMimeType(imageUrl);

      console.log(
        `[X] Uploading image to Twitter (${imageBuffer.length} bytes, ${mimeType})`
      );
      const mediaId = await client.v1.uploadMedia(imageBuffer, { mimeType });

      console.log(`[X] Image uploaded, mediaId=${mediaId}. Posting tweet...`);
      response = await client.v2.tweet(tweetText, {
        media: { media_ids: [mediaId] },
      });
    } catch (imgErr) {
      // Image upload failed — fall back to text-only tweet
      console.warn(
        `[X] Image upload failed (${imgErr.message}), posting text-only tweet`
      );
      response = await client.v2.tweet(tweetText);
    }
  } else {
    // No image attached to this complaint — text only
    console.log(`[X] No image on complaint, posting text-only tweet`);
    response = await client.v2.tweet(tweetText);
  }

  const tweetId = response?.data?.id;
  if (!tweetId) {
    throw new Error("X API did not return a tweet id");
  }

  console.log(`[X] ✅ Tweet posted! https://x.com/i/web/status/${tweetId}`);

  return {
    tweetId,
    tweetUrl: `https://x.com/i/web/status/${tweetId}`,
  };
};

// ─── DB helpers ───────────────────────────────────────────────────────────────

const markPostAttempt = async (tx, complaintId) => {
  return tx.complaint.update({
    where: { id: complaintId },
    data: {
      xPostAttempts: { increment: 1 },
      lastXPostAttemptAt: new Date(),
      xPostError: null,
    },
  });
};

const markPostSuccess = async (tx, complaintId, postResult) => {
  return tx.complaint.update({
    where: { id: complaintId },
    data: {
      tweetPosted: true,
      status: "ESCALATED",
      escalatedAt: new Date(),
      xPostStatus: "SENT",
      xPostId: postResult.tweetId,
      xPostUrl: postResult.tweetUrl,
      xPostError: null,
    },
  });
};

const markPostFailure = async (tx, complaintId, error) => {
  const message = String(error?.message || "X posting failed").slice(0, 400);
  return tx.complaint.update({
    where: { id: complaintId },
    data: {
      xPostStatus: "FAILED",
      xPostError: message,
    },
  });
};

module.exports = {
  DAYS_TO_ESCALATE,
  MIN_SUPPORTERS,
  MAX_RETRIES,
  buildHashtags,
  buildEscalationText,
  isEligibleForEscalation,
  postComplaintToX,
  markPostAttempt,
  markPostSuccess,
  markPostFailure,
};

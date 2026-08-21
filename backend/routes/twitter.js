const express = require("express");
const router = express.Router();
const { TwitterApi } = require("twitter-api-v2");
const { PrismaClient } = require("@prisma/client");
const { runEscalationSweep } = require("../jobs/escalationScheduler");

const prisma = new PrismaClient();

// ─── GET /api/twitter/status ──────────────────────────────────────────────────
// Verifies Twitter credentials and shows their permission level
router.get("/status", async (req, res) => {
  const appKey = process.env.X_API_KEY;
  const appSecret = process.env.X_API_KEY_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_TOKEN_SECRET;

  const missing = [];
  if (!appKey) missing.push("X_API_KEY");
  if (!appSecret) missing.push("X_API_KEY_SECRET");
  if (!accessToken) missing.push("X_ACCESS_TOKEN");
  if (!accessSecret) missing.push("X_ACCESS_TOKEN_SECRET");

  if (missing.length) {
    return res.status(400).json({
      ok: false,
      error: "Missing credentials in .env",
      missing,
    });
  }

  try {
    const client = new TwitterApi({ appKey, appSecret, accessToken, accessSecret });
    // Verify credentials — returns the authenticated user
    const me = await client.v2.me({
      "user.fields": ["id", "name", "username"],
    });

    return res.json({
      ok: true,
      message: "✅ Credentials are valid and authenticated",
      user: me.data,
      envSummary: {
        X_API_KEY: appKey.slice(0, 6) + "…",
        X_ACCESS_TOKEN: accessToken.slice(0, 10) + "…",
        ESCALATION_DAYS: process.env.ESCALATION_DAYS,
        ESCALATION_THRESHOLD: process.env.ESCALATION_THRESHOLD,
        ESCALATION_CRON: process.env.ESCALATION_CRON,
      },
    });
  } catch (err) {
    const twitterError = err?.data?.errors?.[0] || err?.data || null;
    return res.status(500).json({
      ok: false,
      error: err.message,
      httpCode: err?.code,
      twitterError,
      hint:
        err?.code === 403 || err?.code === 401
          ? "Your Access Token may have been generated before you set Read+Write. Regenerate it in the Developer Portal under Keys and tokens → Access Token."
          : "Check your .env credentials.",
    });
  }
});

// ─── POST /api/twitter/test-tweet ─────────────────────────────────────────────
// Posts a single test tweet to confirm write access works
router.post("/test-tweet", async (req, res) => {
  const appKey = process.env.X_API_KEY;
  const appSecret = process.env.X_API_KEY_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_TOKEN_SECRET;

  try {
    const client = new TwitterApi({ appKey, appSecret, accessToken, accessSecret });
    const now = new Date().toISOString();
    const result = await client.v2.tweet(
      `🔧 CitiFix escalation test — verifying Twitter write access. ${now}`
    );

    return res.json({
      ok: true,
      message: "✅ Test tweet posted successfully!",
      tweetId: result.data.id,
      tweetUrl: `https://x.com/i/web/status/${result.data.id}`,
    });
  } catch (err) {
    const twitterError = err?.data?.errors?.[0] || err?.data || null;
    return res.status(500).json({
      ok: false,
      error: err.message,
      httpCode: err?.code,
      twitterError,
      hint:
        err?.code === 403
          ? "403 = App lacks Write permission OR Access Token was generated before you set Read+Write. Regenerate the Access Token in Twitter Developer Portal."
          : undefined,
    });
  }
});

// ─── POST /api/twitter/reset-failed ───────────────────────────────────────────
// Resets xPostAttempts on failed complaints so the scheduler can retry them
router.post("/reset-failed", async (req, res) => {
  try {
    const updated = await prisma.complaint.updateMany({
      where: {
        tweetPosted: false,
        xPostStatus: "FAILED",
      },
      data: {
        xPostAttempts: 0,
        xPostStatus: "PENDING",
        xPostError: null,
        lastXPostAttemptAt: null,
      },
    });

    return res.json({
      ok: true,
      message: `✅ Reset ${updated.count} failed complaint(s). Scheduler will retry on next cron tick.`,
      count: updated.count,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ─── POST /api/twitter/trigger-sweep ──────────────────────────────────────────
// Manually trigger the escalation sweep right now (without waiting for cron)
router.post("/trigger-sweep", async (req, res) => {
  try {
    await runEscalationSweep();
    return res.json({
      ok: true,
      message: "✅ Escalation sweep triggered. Check DB and backend logs for results.",
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;

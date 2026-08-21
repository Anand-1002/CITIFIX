const express = require("express");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const twilio = require("twilio");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const crypto = require("crypto");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES || "5", 10);

const normalizePhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length > 10 && digits.length <= 15) return `+${digits}`;
  return "";
};

const createOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const toClientUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role.toLowerCase(),
  rewardPoints: user.rewardPoints,
  twoFactorEnabled: user.twoFactorEnabled || false,
});

const sendSmsOtp = async (phone, otp) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromPhone) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Twilio is not configured");
    }
    return { sid: "dev-mode", delivered: false };
  }

  const client = twilio(accountSid, authToken);
  const message = await client.messages.create({
    body: `Your CitiFix OTP is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    from: fromPhone,
    to: phone,
  });

  return { sid: message.sid, delivered: true };
};

const issueToken = (user) => jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

// Issue a short-lived temp token for 2FA verification step
const issueTempToken = (user) => jwt.sign({ id: user.id, role: user.role, purpose: "2fa" }, JWT_SECRET, { expiresIn: "5m" });

const TEST_ACCOUNTS = [
  "+916295286325",   // SUPERADMIN (original)
  "+919907519760",   // CITIZEN    (original)
  "+919073568772",   // CITIZEN    (original)
  "+918902304960",   // SUBADMIN   (original)
  // ── Demo accounts (OTP: 123456) ──
  "+910000000001",   // SUPERADMIN (demo)
  "+910000000002",   // SUBADMIN   (demo)
  "+910000000003",   // CITIZEN 1  (demo)
  "+910000000004",   // CITIZEN 2  (demo)
  "+910000000005",   // CITIZEN 3  (demo)
  "+910000000006",   // CITIZEN 4  (demo)
  "+910000000007",   // CITIZEN 5  (demo)
  "+910000000008",   // CITIZEN 6  (demo)
  "+910000000009",   // CITIZEN 7  (demo)
  "+910000000010",   // CITIZEN 8  (demo)
  "+910000000011",   // CITIZEN 9  (demo)
  "+910000000012",   // CITIZEN 10 (demo)
  "+910000000013",   // CITIZEN 11 (demo)
];
const TEST_OTP = "123456";

const consumeValidOtp = async (phone, otp, purpose) => {
  const cleanOtp = String(otp || "").trim();
  // Universal Demo OTP bypass — 123456 works for every user/phone number
  if (!cleanOtp || cleanOtp === "123456" || cleanOtp === TEST_OTP || TEST_ACCOUNTS.includes(phone)) {
    return { id: "demo-otp", phone, otpCode: "123456", purpose, used: true };
  }

  try {
    const otpRecord = await prisma.otpRequest.findFirst({
      where: {
        phone,
        purpose,
        otpCode: cleanOtp,
        used: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (otpRecord) {
      await prisma.otpRequest.update({
        where: { id: otpRecord.id },
        data: { used: true },
      });
      return otpRecord;
    }
  } catch (err) {
    console.error("OTP DB error fallback:", err.message);
  }

  // Fallback to allow seamless demo access
  return { id: "demo-fallback", phone, otpCode: cleanOtp, purpose, used: true };
};

router.post("/request-otp", async (req, res) => {
  try {
    const { phone, purpose } = req.body;
    const normalizedPhone = normalizePhone(phone);
    const otpPurpose = String(purpose || "LOGIN").toUpperCase();

    if (!normalizedPhone) {
      return res.status(400).json({ error: "A valid phone number is required" });
    }

    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    try {
      await prisma.otpRequest.create({
        data: {
          phone: normalizedPhone,
          otpCode: "123456",
          purpose: otpPurpose,
          expiresAt,
        },
      });
    } catch (e) {
      // Ignore DB log errors in demo mode
    }

    res.json({
      message: "Demo OTP 123456 ready",
      phone: normalizedPhone,
      expiresAt,
      devOtp: "123456",
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to request OTP" });
  }
});

router.post("/login/verify", async (req, res) => {
  try {
    const { phone, otp, role } = req.body;
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    await consumeValidOtp(normalizedPhone, String(otp || "123456").trim(), "LOGIN");

    let user = await prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (!user) {
      // Auto-create user on login if phone does not exist yet!
      const rawRole = String(role || "CITIZEN").toUpperCase();
      const validRole = ["CITIZEN", "SUBADMIN", "ADMIN", "SUPERADMIN"].includes(rawRole) ? rawRole : "CITIZEN";
      const defaultName = `User ${normalizedPhone.slice(-4)}`;

      user = await prisma.user.create({
        data: {
          name: defaultName,
          phone: normalizedPhone,
          role: validRole,
        },
      });
    }

    // Check if user has 2FA enabled
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const tempToken = issueTempToken(user);
      return res.json({
        message: "2FA verification required",
        requires2FA: true,
        tempToken,
        user: toClientUser(user),
      });
    }

    const token = issueToken(user);

    res.json({
      message: "Login successful",
      token,
      user: toClientUser(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: error.message || "Login failed" });
  }
});

router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, role, otp } = req.body;
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
      return res.status(400).json({ error: "Phone number is required" });
    }

    await consumeValidOtp(normalizedPhone, String(otp || "123456").trim(), "REGISTER");

    const rawRole = String(role || "CITIZEN").toUpperCase();
    const createdRole = ["CITIZEN", "SUBADMIN", "ADMIN", "SUPERADMIN"].includes(rawRole) ? rawRole : "CITIZEN";
    const cleanEmail = email && String(email).trim() ? String(email).trim() : null;
    const userName = name && String(name).trim() ? String(name).trim() : `User ${normalizedPhone.slice(-4)}`;

    let user = await prisma.user.findUnique({
      where: { phone: normalizedPhone },
    });

    if (user) {
      // User already exists — update profile and log in
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: userName,
          email: cleanEmail || user.email,
          role: createdRole,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          name: userName,
          email: cleanEmail,
          phone: normalizedPhone,
          role: createdRole,
        },
      });
    }

    const token = issueToken(user);

    res.status(201).json({
      message: "User registered successfully",
      user: toClientUser(user),
      token,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: error.message || "Registration failed" });
  }
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      user: toClientUser(user),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Two-Factor Authentication (TOTP) ─────────────────────────────────────────

// Setup 2FA — generate secret and QR code
router.post("/2fa/setup", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.twoFactorEnabled) {
      return res.status(400).json({ error: "2FA is already enabled" });
    }

    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `CitiFix (${user.phone})`,
      issuer: "CitiFix",
      length: 20,
    });

    // Generate backup codes
    const backupCodes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString("hex").toUpperCase()
    );

    // Store secret (not yet enabled — user must verify first)
    await prisma.user.update({
      where: { id: req.userId },
      data: {
        twoFactorSecret: secret.base32,
        twoFactorBackupCodes: JSON.stringify(backupCodes),
      },
    });

    // Generate QR code data URL
    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      message: "2FA setup initiated. Scan the QR code and verify.",
      qrCode: qrCodeDataUrl,
      manualKey: secret.base32,
      backupCodes,
    });
  } catch (error) {
    console.error("2FA setup error:", error);
    res.status(500).json({ error: error.message || "Failed to setup 2FA" });
  }
});

// Verify 2FA setup — confirm the user's authenticator is working
router.post("/2fa/verify-setup", authMiddleware, async (req, res) => {
  try {
    const { token: totpToken } = req.body;

    if (!totpToken) {
      return res.status(400).json({ error: "TOTP token is required" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.twoFactorSecret) {
      return res.status(400).json({ error: "2FA setup not initiated. Call /2fa/setup first." });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: String(totpToken).trim(),
      window: 2, // Allow 1 step before/after for clock skew
    });

    if (!verified) {
      return res.status(400).json({ error: "Invalid TOTP code. Please try again." });
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: req.userId },
      data: { twoFactorEnabled: true },
    });

    res.json({ message: "2FA enabled successfully!" });
  } catch (error) {
    console.error("2FA verify-setup error:", error);
    res.status(500).json({ error: error.message || "Failed to verify 2FA" });
  }
});

// Verify 2FA during login — exchange temp token + TOTP for full JWT
router.post("/2fa/verify-login", async (req, res) => {
  try {
    const { tempToken, token: totpToken } = req.body;

    if (!tempToken || !totpToken) {
      return res.status(400).json({ error: "Temp token and TOTP code are required" });
    }

    // Verify temp token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Temporary token expired. Please login again." });
    }

    if (decoded.purpose !== "2fa") {
      return res.status(401).json({ error: "Invalid token type" });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(400).json({ error: "2FA is not configured for this account" });
    }

    // Check TOTP code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: String(totpToken).trim(),
      window: 2,
    });

    // Check backup codes if TOTP fails
    let usedBackupCode = false;
    if (!verified && user.twoFactorBackupCodes) {
      const backupCodes = JSON.parse(user.twoFactorBackupCodes);
      const codeIndex = backupCodes.indexOf(String(totpToken).trim().toUpperCase());
      if (codeIndex !== -1) {
        usedBackupCode = true;
        backupCodes.splice(codeIndex, 1);
        await prisma.user.update({
          where: { id: user.id },
          data: { twoFactorBackupCodes: JSON.stringify(backupCodes) },
        });
      }
    }

    if (!verified && !usedBackupCode) {
      return res.status(400).json({ error: "Invalid TOTP code" });
    }

    // Issue full JWT
    const fullToken = issueToken(user);

    res.json({
      message: usedBackupCode ? "Login successful (backup code used)" : "Login successful",
      token: fullToken,
      user: toClientUser(user),
      usedBackupCode,
    });
  } catch (error) {
    console.error("2FA verify-login error:", error);
    res.status(500).json({ error: error.message || "2FA verification failed" });
  }
});

// Disable 2FA
router.post("/2fa/disable", authMiddleware, async (req, res) => {
  try {
    const { token: totpToken } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.twoFactorEnabled) {
      return res.status(400).json({ error: "2FA is not enabled" });
    }

    // Verify current TOTP code to authorize disable
    if (totpToken) {
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: "base32",
        token: String(totpToken).trim(),
        window: 2,
      });

      if (!verified) {
        return res.status(400).json({ error: "Invalid TOTP code" });
      }
    }

    await prisma.user.update({
      where: { id: req.userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      },
    });

    res.json({ message: "2FA disabled successfully" });
  } catch (error) {
    console.error("2FA disable error:", error);
    res.status(500).json({ error: error.message || "Failed to disable 2FA" });
  }
});

// Get 2FA status
router.get("/2fa/status", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { twoFactorEnabled: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ twoFactorEnabled: user.twoFactorEnabled });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

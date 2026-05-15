const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const { sendContactEmail, isEmailConfigured } = require("./src/services/emailService");

const app = express();

const {
  PORT = 10000,
  CONTACT_RECEIVER,
} = process.env;

if (!CONTACT_RECEIVER) {
  throw new Error("Missing CONTACT_RECEIVER in environment variables.");
}

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'", "https://cdn.tailwindcss.com", "https://unpkg.com"],
      "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://fonts.gstatic.com"],
      "img-src": ["'self'", "data:", "https://cdn.jsdelivr.net", "https://upload.wikimedia.org"],
      "connect-src": ["'self'"],
    },
  },
}));
app.use(cors());
app.use(morgan("dev"));

// Rate Limiting - 3 messages per day per IP (default keyGenerator uses ipKeyGenerator for IPv6)
const contactLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3, // 3 requests per window
  message: { error: "You can only send 3 messages per day. Please try again tomorrow." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(express.json({ limit: "100kb" }));
app.use(express.static(__dirname));
app.use('/dist', express.static(path.join(__dirname, 'dist')));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "contact-api",
    emailConfigured: isEmailConfigured(),
  });
});

app.post("/api/contact", contactLimiter, async (req, res, next) => {
  try {
    const name = req.body?.name?.trim();
    const email = req.body?.email?.trim();
    const subject = req.body?.subject?.trim();
    const message = req.body?.message?.trim();

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "All fields are required." });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }

    if (message.length < 10) {
      return res.status(400).json({ error: "Message should be at least 10 characters." });
    }

    // Send email via service (no database save for faster response)
    await sendContactEmail({
      to: CONTACT_RECEIVER,
      replyTo: email,
      subject,
      name,
      message,
    });

    return res.status(201).json({ success: true, message: "Message sent." });
  } catch (err) {
    if (err.statusCode >= 400 && err.statusCode < 600 && err.expose) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
});

// Global Error Handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  const code = err.statusCode;
  const safeClientError =
    err.expose &&
    Number.isInteger(code) &&
    code >= 400 &&
    code < 600;
  const status = safeClientError ? code : 500;
  const body = safeClientError ? { error: err.message } : { error: "Internal Server Error" };
  res.status(status).json(body);
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

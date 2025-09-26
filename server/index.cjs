// Hardened prod server for /dist/spa with CSP (report-only), logging, rate limiting,
// health check, error handling, request IDs, CSP report validation, graceful shutdown,
// and sensible static caching (CommonJS).

const express = require("express");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const pino = require("pino");
const { randomUUID } = require("crypto");

// ---- Logger ---------------------------------------------------------------
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
});

// ---- App ------------------------------------------------------------------
const app = express();
const PORT = process.env.PORT || 8080;

// Trust proxy if deploying behind a reverse proxy (CloudFront/Amplify/etc.)
if (process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

// ---- Request ID middleware ------------------------------------------------
app.use((req, res, next) => {
  req.id = req.headers["x-request-id"] || randomUUID();
  res.setHeader("X-Request-Id", req.id);
  next();
});

// ---- Security headers (except CSP—we manage it manually) ------------------
app.use(
  helmet({
    contentSecurityPolicy: false, // we set our own Report-Only header below
    crossOriginEmbedderPolicy: false, // SPA libs sometimes break with COEP on
  })
);

// ---- Body parsing (tight limits; CSP reports are tiny) --------------------
app.use(express.json({ type: ["application/csp-report", "application/json"], limit: "50kb" }));

// ---- Rate-limit the CSP report endpoint ----------------------------------
const cspLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100, // per IP per window
  standardHeaders: true,
  legacyHeaders: false,
});

// ---- CSP (Report-Only) ----------------------------------------------------
app.use((req, res, next) => {
  const cspDirectives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "style-src 'self' 'unsafe-inline'", // move toward nonces/hashes later
    "script-src 'self'",                // consider nonces once inline removed
    "connect-src 'self'",
    "worker-src 'self' blob:",
    "media-src 'self' blob:",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
    "report-uri /__cspreport__",
  ].join("; ");

  res.setHeader("Content-Security-Policy-Report-Only", cspDirectives);
  next();
});

// ---- CSP report validation ------------------------------------------------
const validateCSPReport = (body) =>
  body &&
  (body["csp-report"] && typeof body["csp-report"] === "object" ||
   body["csp_report"] && typeof body["csp_report"] === "object"); // some UAs underscore

// ---- CSP violation receiver ----------------------------------------------
app.post("/__cspreport__", cspLimiter, (req, res, next) => {
  try {
    if (!validateCSPReport(req.body)) {
      logger.warn({ reqId: req.id, body: req.body }, "Invalid CSP report payload");
      return res.status(400).json({ error: "invalid csp report" });
    }
    logger.warn({ reqId: req.id, violation: req.body }, "CSP Violation");
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ---- Health check ---------------------------------------------------------
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// ---- Static asset caching -------------------------------------------------
const distSpa = path.join(__dirname, "..", "dist", "spa");
app.use(
  express.static(distSpa, {
    maxAge: "1d",
    etag: true,
    setHeaders: (res, filePath) => {
      if (path.basename(filePath) === "index.html") {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
      }
    },
  })
);

// ---- History-mode fallback ------------------------------------------------
app.get("*", (_req, res) => {
  res.sendFile(path.join(distSpa, "index.html"));
});

// ---- Error handler (complete) --------------------------------------------
app.use((err, req, res, _next) => {
  logger.error({ reqId: req.id, err, path: req.path }, "Unhandled server error");
  res.status(500).json({ error: "Internal Server Error" });
});

// ---- Start & graceful shutdown -------------------------------------------
const server = app.listen(PORT, () => {
  logger.info(`Prod server running at http://localhost:${PORT}`);
});

const shutdown = (signal) => {
  logger.info(`${signal} received: closing HTTP server`);
  server.close((err) => {
    if (err) {
      logger.error({ err }, "Error during server close");
      process.exit(1);
    }
    logger.info("HTTP server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

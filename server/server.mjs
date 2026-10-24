import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import { connect_db } from "./libs/mongodb.mjs";
import {
  authRoutes,
  profileRoutes,
  passwordRoutes,
  attendanceRoutes,
  leaveRoutes,
  correctionRoutes,
  setupRoutes,
  settingsRoutes,
  organizationRoutes,
  holidayRoutes,
  leavetypeRoutes,
  userRoutes,
  employeeRoutes,
  auditRoutes,
  commsRoutes,
  payrollRoutes,
  analyticsRoutes,
  aiRoutes,
} from "./routes/index.mjs";
import { initAdminOnBoot } from "./services/setup.service.mjs";

const app = express();
const port = process.env.PORT || 2002;

// Trust reverse proxy headers (e.g. Render / Heroku / Nginx)
app.set("trust proxy", 1);

// ── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS — restrict to the frontend origin ────────────────────────────────────
const defaultAllowedOrigins = ["https://hcm-lite-dev.vercel.app", "http://localhost:3003"];

const allowedOrigins = (process.env.CLIENT_ORIGIN || defaultAllowedOrigins.join(","))
  .split(",")
  .map((o) => o.trim());

if (!allowedOrigins.includes("https://hcm-lite-dev.vercel.app")) {
  allowedOrigins.push("https://hcm-lite-dev.vercel.app");
}

if (process.env.VERCEL_URL) {
  allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server) or matching origins
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  }),
);

// ── Ensure DB Connection for Serverless ───────────────────────────────────────
app.use(async (_req, _res, next) => {
  if (mongoose.connection.readyState !== 1 && process.env.NODE_ENV !== "test") {
    try {
      await connect_db();
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

// ── Health check (no auth) ────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// ── Root ──────────────────────────────────────────────────────────────────────
app.get("/", (_req, res) => res.send("HCM Lite API"));

// ── API routes ────────────────────────────────────────────────────────────────
// Single canonical API prefix used everywhere across client and server
app.use(
  "/api/v1",
  authRoutes,
  profileRoutes,
  passwordRoutes,
  attendanceRoutes,
  leaveRoutes,
  correctionRoutes,
  setupRoutes,
  settingsRoutes,
  organizationRoutes,
  holidayRoutes,
  leavetypeRoutes,
  userRoutes,
  employeeRoutes,
  auditRoutes,
  commsRoutes,
  payrollRoutes,
  analyticsRoutes,
  aiRoutes,
);

// Fallback direct mounts for convenience
app.use(setupRoutes);
app.use(settingsRoutes);
app.use(organizationRoutes);
app.use(holidayRoutes);
app.use(leavetypeRoutes);
app.use(userRoutes);
app.use(employeeRoutes);
app.use(auditRoutes);
app.use(commsRoutes);
app.use(payrollRoutes);
app.use(analyticsRoutes);
app.use(aiRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
});

// ── Global error handler ──────────────────────────────────────────────────────
// Must have 4 parameters so Express recognises it as an error handler.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // Known application error thrown with AppError
  if (err.isAppError) {
    const body = { error: { code: err.code, message: err.message } };
    if (err.fields) body.error.fields = err.fields;
    return res.status(err.status).json(body);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({
      error: { code: "DUPLICATE", message: `${field} already exists` },
    });
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const fields = {};
    for (const [k, v] of Object.entries(err.errors)) fields[k] = v.message;
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Validation failed", fields },
    });
  }

  // Body-parser / JSON parse errors
  if (err.type === "entity.parse.failed") {
    return res
      .status(400)
      .json({ error: { code: "INVALID_JSON", message: "Request body is not valid JSON" } });
  }

  // Unexpected error — log but don't leak details
  console.error("[UNHANDLED ERROR]", err);
  return res
    .status(500)
    .json({ error: { code: "INTERNAL_ERROR", message: "Internal server error" } });
});

// ── Start ─────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.listen(port, () => {
    console.log(`Server running → http://localhost:${port}`);
  });
  connect_db()
    .then(() => initAdminOnBoot())
    .catch(console.error);
}

export default app;

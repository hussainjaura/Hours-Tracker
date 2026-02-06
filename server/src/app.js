// src/app.js
import express from "express";
import cors from "cors";

import authRouter from "./routes/auth.js";
import studentsRouter from "./routes/students.js";
import employerRoutes from "./routes/employer.js";
import adminRoutes from "./routes/admin.js";
import termRoutes from "./routes/terms.js";
import adminTermRoutes from "./routes/adminTerms.js";
import auditRoutes from "./routes/audit.js";
import auditExportRoutes from "./routes/auditExport.js";
import adminTermTemplateRoutes from "./routes/adminTermTemplate.js";
import relationshipsRoutes from "./routes/relationships.js";
import complianceRoutes from "./routes/compliance.js";
import healthRouter from "./routes/health.js";
// Middleware
import { requestIdMiddleware } from "./middleware/requestId.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { rateLimiter, authRateLimiter, requestSizeLimiter, securityHeaders } from "./middleware/security.js";

const app = express();

// Security headers
app.use(securityHeaders);

// CORS
app.use(cors());

// Request ID tracking (must be early in the middleware chain)
app.use(requestIdMiddleware);

// Request size limiting (before body parsing)
app.use(requestSizeLimiter(1024 * 1024)); // 1MB limit

// Body parsing
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Health check (before rate limiting - should not be rate limited)
app.use("/health", healthRouter);

// Rate limiting (general) - applied to all routes after this point
app.use(rateLimiter());

app.use("/auth", authRouter);
app.use("/students", studentsRouter);
app.use("/employer", employerRoutes);
app.use("/admin", adminRoutes);
app.use("/terms", termRoutes);
app.use("/adminTerms", adminTermRoutes);
app.use("/audit", auditRoutes);
app.use("/audit-export", auditExportRoutes);
app.use("/adminTermTemplate", adminTermTemplateRoutes);
app.use("/relationships", relationshipsRoutes);
app.use("/compliance", complianceRoutes);


app.get("/", (req, res) => {
  res.json({ 
    message: "API is running",
    version: process.env.API_VERSION || "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler (must be before error handler)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

export default app;

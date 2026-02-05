/**
 * Health Check Endpoint
 * Provides database connectivity, API status, and version information
 */

import express from "express";
import prisma from "../prisma.js";
import { AppError } from "../utils/errors.js";
import { clearRateLimitStore } from "../middleware/security.js";

const router = express.Router();

/**
 * Health check endpoint
 * GET /health
 */
router.get("/", async (req, res) => {
  const healthStatus = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || "1.0.0",
    environment: process.env.NODE_ENV || "development",
    uptime: process.uptime(),
    services: {
      database: {
        status: "unknown",
        responseTime: null,
      },
      api: {
        status: "ok",
      },
    },
  };

  // Check database connectivity
  const dbStartTime = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const dbResponseTime = Date.now() - dbStartTime;
    
    healthStatus.services.database = {
      status: "ok",
      responseTime: `${dbResponseTime}ms`,
    };
  } catch (error) {
    const dbResponseTime = Date.now() - dbStartTime;
    
    healthStatus.status = "degraded";
    healthStatus.services.database = {
      status: "error",
      responseTime: `${dbResponseTime}ms`,
      error: error.message,
    };
  }

  // Determine overall status
  const allServicesOk = Object.values(healthStatus.services).every(
    (service) => service.status === "ok"
  );

  if (!allServicesOk) {
    healthStatus.status = "degraded";
  }

  // Return appropriate status code
  const statusCode = healthStatus.status === "ok" ? 200 : 503;
  res.status(statusCode).json(healthStatus);
});

/**
 * Readiness probe endpoint
 * GET /health/ready
 * Returns 200 if the service is ready to accept traffic
 */
router.get("/ready", async (req, res) => {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: "ready",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: "not ready",
      timestamp: new Date().toISOString(),
      error: "Database connection failed",
    });
  }
});

/**
 * Liveness probe endpoint
 * GET /health/live
 * Returns 200 if the service is alive
 */
router.get("/live", (req, res) => {
  res.status(200).json({
    status: "alive",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Clear rate limit store (development only)
 * POST /health/clear-rate-limit
 * Clears the in-memory rate limit store
 */
router.post("/clear-rate-limit", (req, res) => {
  // Only allow in development mode
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      error: "This endpoint is only available in development mode",
    });
  }

  clearRateLimitStore();
  res.status(200).json({
    message: "Rate limit store cleared successfully",
    timestamp: new Date().toISOString(),
  });
});

export default router;


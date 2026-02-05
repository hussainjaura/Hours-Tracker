/**
 * Security Middleware
 * Provides rate limiting, request size limits, and other security features
 */

import { AppError } from "../utils/errors.js";

// In-memory rate limiting store (in production, use Redis)
const rateLimitStore = new Map();

/**
 * Clear rate limit store (useful for development/testing)
 */
export const clearRateLimitStore = () => {
  rateLimitStore.clear();
  console.log('Rate limit store cleared');
};

/**
 * Rate limiting middleware
 * @param {Object} options - Rate limit options
 * @param {number} options.windowMs - Time window in milliseconds (default: 15 minutes)
 * @param {number} options.maxRequests - Maximum requests per window (default: 100)
 * @param {string} options.message - Custom error message
 */
export const rateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = process.env.NODE_ENV === 'production' ? 100 : 1000, // More lenient in development
    message = "Too many requests, please try again later",
  } = options;

  return (req, res, next) => {
    // Get client identifier (IP address or user ID if authenticated)
    const identifier = req.user?.id || req.ip || req.socket.remoteAddress;
    const key = `${req.method}:${req.path}:${identifier}`;
    const now = Date.now();

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      // 1% chance to clean up
      for (const [k, v] of rateLimitStore.entries()) {
        if (now - v.resetTime > windowMs) {
          rateLimitStore.delete(k);
        }
      }
    }

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);

    if (!entry || now - entry.resetTime > windowMs) {
      // Create new entry or reset expired one
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    entry.count++;

    // Check if limit exceeded
    if (entry.count > maxRequests) {
      const resetTime = new Date(entry.resetTime).toISOString();
      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", 0);
      res.setHeader("X-RateLimit-Reset", resetTime);
      
      const error = new AppError(message, 429, "RATE_LIMIT_EXCEEDED");
      return res.status(429).json({
        success: false,
        error: {
          message: error.message,
          code: error.code,
          requestId: req.requestId || null,
          timestamp: new Date().toISOString(),
          retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        },
      });
    }

    // Update store
    rateLimitStore.set(key, entry);

    // Set rate limit headers
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - entry.count));
    res.setHeader("X-RateLimit-Reset", new Date(entry.resetTime).toISOString());

    next();
  };
};

/**
 * Strict rate limiter for authentication endpoints
 * More lenient in development mode
 */
export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: process.env.NODE_ENV === 'production' ? 5 : 20, // 5 in production, 20 in development
  message: "Too many authentication attempts, please try again later",
});

/**
 * Request size limit middleware
 * @param {number} maxSize - Maximum request body size in bytes (default: 1MB)
 */
export const requestSizeLimiter = (maxSize = 1024 * 1024) => {
  return (req, res, next) => {
    const contentLength = parseInt(req.get("content-length") || "0", 10);

    if (contentLength > maxSize) {
      const error = new AppError(
        `Request body too large. Maximum size is ${maxSize / 1024}KB`,
        413,
        "PAYLOAD_TOO_LARGE"
      );
      return res.status(413).json({
        success: false,
        error: {
          message: error.message,
          code: error.code,
          requestId: req.requestId || null,
          timestamp: new Date().toISOString(),
        },
      });
    }

    next();
  };
};

/**
 * Helmet-like security headers middleware
 */
export const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");
  
  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  
  // Enable XSS protection
  res.setHeader("X-XSS-Protection", "1; mode=block");
  
  // Strict transport security (if using HTTPS)
  if (req.secure || req.headers["x-forwarded-proto"] === "https") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }
  
  next();
};


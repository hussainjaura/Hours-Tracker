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
 * @param {boolean} options.countFailedOnly - Only count requests that end in an
 *   error (status 400+). Used for login so normal sign-ins never lock anyone out.
 * @param {Function} options.keyExtra - Extra value to add to the key (e.g. the
 *   email being logged into), so people sharing one IP don't block each other.
 *
 * Note: req.ip is only the real visitor's IP when Express's "trust proxy" is
 * set (see TRUST_PROXY in app.js). Without it, behind a host's load balancer
 * every visitor shares the proxy's IP and therefore one limit.
 */
export const rateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = process.env.NODE_ENV === 'production' ? 100 : 1000, // More lenient in development
    message = "Too many requests, please try again later",
    countFailedOnly = false,
    keyExtra = null,
  } = options;

  return (req, res, next) => {
    // Get client identifier (IP address or user ID if authenticated)
    const identifier = req.user?.id || req.ip || req.socket.remoteAddress;
    const extra = keyExtra ? `:${keyExtra(req) || ""}` : "";
    const key = `${req.method}:${req.path}:${identifier}${extra}`;
    const now = Date.now();

    // Clean up expired entries periodically
    if (Math.random() < 0.01) {
      // 1% chance to clean up
      for (const [k, v] of rateLimitStore.entries()) {
        if (now >= v.resetTime) {
          rateLimitStore.delete(k);
        }
      }
    }

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);

    // resetTime is when the window ends, so the window has expired once we pass it
    if (!entry || now >= entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    // Block if the limit was already reached in this window
    if (entry.count >= maxRequests) {
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

    if (countFailedOnly) {
      // Count this request only once we know it failed
      res.on("finish", () => {
        if (res.statusCode >= 400) {
          entry.count++;
        }
      });
    } else {
      entry.count++;
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
 * Strict rate limiter for authentication endpoints (login, register, password reset).
 * Only failed attempts count, and they're counted per IP + email, so a room of
 * people on the same Wi-Fi (e.g. a live demo) can all log in normally while
 * password guessing against one account is still blocked.
 */
export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: process.env.NODE_ENV === 'production' ? 10 : 50,
  message: "Too many failed attempts, please wait 15 minutes and try again",
  countFailedOnly: true,
  keyExtra: (req) => (typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : ""),
});

/**
 * Limiter for "forgot password". Every request counts (they all return 200 so
 * attackers can't tell which emails exist), keyed per IP + email, so nobody can
 * flood someone's inbox with reset emails.
 */
export const passwordResetRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: process.env.NODE_ENV === 'production' ? 3 : 20,
  message: "Too many password reset requests, please wait 15 minutes and try again",
  keyExtra: (req) => (typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : ""),
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


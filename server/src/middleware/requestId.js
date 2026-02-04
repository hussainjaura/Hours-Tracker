/**
 * Request ID Middleware
 * Generates a unique request ID for each request to track errors and logs
 */

import { randomUUID } from "crypto";

/**
 * Middleware to generate and attach a request ID to each request
 */
export const requestIdMiddleware = (req, res, next) => {
  // Generate a unique request ID
  const requestId = randomUUID();
  
  // Attach to request object for use in controllers
  req.requestId = requestId;
  
  // Add to response header for client tracking
  res.setHeader("X-Request-ID", requestId);
  
  next();
};


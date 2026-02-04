/**
 * Global Error Handler Middleware
 * Handles all errors in a consistent format
 */

import { AppError, createErrorResponse, handlePrismaError, logError, getUserFriendlyMessage } from "../utils/errors.js";

/**
 * Global error handler middleware
 * Should be added as the last middleware in app.js
 */
export const errorHandler = (err, req, res, next) => {
  const requestId = req.requestId || null;

  // Handle Prisma errors
  let error = handlePrismaError(err);

  // If it's not an AppError, convert it
  if (!(error instanceof AppError)) {
    const message = getUserFriendlyMessage(error);
    error = new AppError(
      message,
      error.statusCode || 500,
      error.code || "INTERNAL_SERVER_ERROR"
    );
  }

  // Log the error
  logError(error, requestId, {
    method: req.method,
    path: req.path,
    body: req.body,
    query: req.query,
    params: req.params,
    user: req.user?.id || "anonymous",
  });

  // Send error response
  const errorResponse = createErrorResponse(error, requestId);
  res.status(error.statusCode || 500).json(errorResponse);
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res, next) => {
  const requestId = req.requestId || null;
  const error = new AppError(
    `Route ${req.method} ${req.path} not found`,
    404,
    "NOT_FOUND"
  );
  
  const errorResponse = createErrorResponse(error, requestId);
  res.status(404).json(errorResponse);
};


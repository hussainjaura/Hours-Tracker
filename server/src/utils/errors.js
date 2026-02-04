/**
 * Error handling utilities
 * Provides consistent error response format and error logging
 */

import { Prisma } from "@prisma/client";

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = null, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Creates a consistent error response format
 */
export const createErrorResponse = (error, requestId = null) => {
  const response = {
    success: false,
    error: {
      message: error.message || "An error occurred",
      requestId: requestId || null,
      timestamp: new Date().toISOString(),
    },
  };

  // Add error code if available
  if (error.code) {
    response.error.code = error.code;
  }

  // Add details if available (but not in production for security)
  if (error.details && process.env.NODE_ENV !== "production") {
    response.error.details = error.details;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === "development" && error.stack) {
    response.error.stack = error.stack;
  }

  return response;
};

/**
 * Maps Prisma errors to user-friendly messages
 */
export const handlePrismaError = (error) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return new AppError(
          "A record with this value already exists",
          409,
          "DUPLICATE_ENTRY"
        );
      case "P2025":
        return new AppError("Record not found", 404, "NOT_FOUND");
      case "P2003":
        return new AppError(
          "Invalid reference to related record",
          400,
          "INVALID_REFERENCE"
        );
      case "P2014":
        return new AppError(
          "Invalid ID provided",
          400,
          "INVALID_ID"
        );
      default:
        return new AppError(
          "Database operation failed",
          500,
          "DATABASE_ERROR"
        );
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new AppError(
      "Invalid data provided",
      400,
      "VALIDATION_ERROR",
      error.message
    );
  }

  return error;
};

/**
 * Logs error with context
 */
export const logError = (error, requestId = null, context = {}) => {
  const errorLog = {
    requestId,
    timestamp: new Date().toISOString(),
    message: error.message,
    stack: error.stack,
    statusCode: error.statusCode || 500,
    code: error.code || "UNKNOWN_ERROR",
    context,
  };

  // Log to console (in production, you'd want to use a proper logging service)
  console.error("ERROR:", JSON.stringify(errorLog, null, 2));

  // In production, you might want to send to a logging service like:
  // - Winston
  // - Pino
  // - Sentry
  // - CloudWatch
};

/**
 * Creates a user-friendly error message
 */
export const getUserFriendlyMessage = (error) => {
  if (error instanceof AppError) {
    return error.message;
  }

  // Map common errors to user-friendly messages
  if (error.name === "ValidationError") {
    return "The provided data is invalid";
  }

  if (error.name === "UnauthorizedError") {
    return "You are not authorized to perform this action";
  }

  if (error.name === "JsonWebTokenError") {
    return "Invalid authentication token";
  }

  if (error.name === "TokenExpiredError") {
    return "Your session has expired. Please log in again";
  }

  // Default message
  return "An unexpected error occurred. Please try again later";
};


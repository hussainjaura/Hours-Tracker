/**
 * Password validation utilities
 */

import { AppError } from "./errors.js";

/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with valid flag and error message
 */
export const validatePasswordStrength = (password) => {
  if (!password || typeof password !== "string") {
    return {
      valid: false,
      error: "Password must be a valid string",
    };
  }

  // Minimum length
  if (password.length < 8) {
    return {
      valid: false,
      error: "Password must be at least 8 characters long",
    };
  }

  // Maximum length
  if (password.length > 128) {
    return {
      valid: false,
      error: "Password must be no more than 128 characters long",
    };
  }

  // At least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one uppercase letter",
    };
  }

  // At least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one lowercase letter",
    };
  }

  // At least one number
  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one number",
    };
  }

  // At least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return {
      valid: false,
      error: "Password must contain at least one special character",
    };
  }

  // Check for common weak passwords
  const commonPasswords = [
    "password",
    "password123",
    "12345678",
    "qwerty123",
    "admin123",
  ];
  if (commonPasswords.includes(password.toLowerCase())) {
    return {
      valid: false,
      error: "Password is too common. Please choose a stronger password",
    };
  }

  return { valid: true };
};

/**
 * Password validator for use in validation middleware
 */
export const passwordValidator = (password, fieldName = "password") => {
  return validatePasswordStrength(password);
};


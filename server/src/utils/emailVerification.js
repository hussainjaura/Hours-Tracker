/**
 * Email Verification Utilities
 * Optional email verification functionality
 * 
 * Note: This is a basic implementation. In production, you would:
 * - Use a proper email service (SendGrid, AWS SES, etc.)
 * - Store verification tokens in the database
 * - Set expiration times for tokens
 * - Implement resend functionality
 */

import { randomBytes } from "crypto";
import { AppError } from "./errors.js";

// In-memory store for verification tokens (in production, use database)
const verificationTokens = new Map();

/**
 * Generates a verification token
 * @param {string} email - Email address to verify
 * @returns {string} Verification token
 */
export const generateVerificationToken = (email) => {
  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

  verificationTokens.set(token, {
    email,
    expiresAt,
    verified: false,
  });

  // Clean up expired tokens periodically
  if (Math.random() < 0.01) {
    // 1% chance to clean up
    for (const [t, data] of verificationTokens.entries()) {
      if (Date.now() > data.expiresAt) {
        verificationTokens.delete(t);
      }
    }
  }

  return token;
};

/**
 * Verifies an email token
 * @param {string} token - Verification token
 * @returns {Object} Verification result with email
 */
export const verifyToken = (token) => {
  const data = verificationTokens.get(token);

  if (!data) {
    throw new AppError("Invalid verification token", 400, "INVALID_TOKEN");
  }

  if (Date.now() > data.expiresAt) {
    verificationTokens.delete(token);
    throw new AppError("Verification token has expired", 400, "TOKEN_EXPIRED");
  }

  if (data.verified) {
    throw new AppError("Email already verified", 400, "ALREADY_VERIFIED");
  }

  // Mark as verified
  data.verified = true;
  verificationTokens.set(token, data);

  return { email: data.email };
};

/**
 * Sends verification email (mock implementation)
 * In production, integrate with an email service
 * @param {string} email - Email address
 * @param {string} token - Verification token
 */
export const sendVerificationEmail = async (email, token) => {
  // Mock email sending
  // In production, use a service like:
  // - SendGrid
  // - AWS SES
  // - Nodemailer with SMTP
  // - Mailgun
  // - Resend

  const verificationUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify-email?token=${token}`;

  console.log("=".repeat(60));
  console.log("EMAIL VERIFICATION (Mock)");
  console.log("=".repeat(60));
  console.log(`To: ${email}`);
  console.log(`Subject: Verify your email address`);
  console.log(`\nPlease verify your email by clicking the link below:\n`);
  console.log(verificationUrl);
  console.log("\nThis link will expire in 24 hours.");
  console.log("=".repeat(60));

  // In production, replace with actual email sending:
  /*
  await emailService.send({
    to: email,
    subject: "Verify your email address",
    html: `
      <h1>Verify your email address</h1>
      <p>Please click the link below to verify your email:</p>
      <a href="${verificationUrl}">Verify Email</a>
      <p>This link will expire in 24 hours.</p>
    `,
  });
  */
};

/**
 * Checks if email verification is enabled
 */
export const isEmailVerificationEnabled = () => {
  return process.env.ENABLE_EMAIL_VERIFICATION === "true";
};


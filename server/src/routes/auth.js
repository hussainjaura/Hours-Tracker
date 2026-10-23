import express from "express";
import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import prisma from "../prisma.js";
import { signToken } from "../utils/jwt.js";
import requireAuth from "../middleware/requireAuth.js";
import { validate } from "../middleware/validation.js";
import { authRateLimiter, passwordResetRateLimiter, verificationEmailRateLimiter } from "../middleware/security.js";
import { AppError } from "../utils/errors.js";
import { createHash } from "crypto";
import { sendPasswordResetEmail } from "../utils/email.js";
import {
  createAndSendVerification,
  isEmailVerificationEnabled,
  verifyEmailToken,
} from "../utils/emailVerification.js";
import { getClientIp } from "../utils/auditLogger.js";
import { VISA_TYPES } from "../utils/workEligibility.js";

const router = express.Router();

// Password reset tokens are stored hashed, like passwords. SHA-256 is enough
// here (no bcrypt needed) because the token is 32 random bytes, not a guessable word:
const hashResetToken = (token) => createHash("sha256").update(token).digest("hex");

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        // the website uses this to show the "verify your email" banner:
        emailVerifiedAt: true,
        student: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error("ME ERROR:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});



// REGISTER:
router.post("/register", 
  authRateLimiter, // Stricter rate limiting for registration
  validate([
    { field: 'email', validator: 'email' },
    { field: 'password', validator: 'password' }, // Password strength validation
    { field: 'role', validator: 'role' }
  ]),
  async (req, res) => {
  try {
    const { password, role, employerProfile, studentProfile } = req.body;

    // this saves every new email in small letters so capitals cannot make a second account:
    const email = req.body.email.trim().toLowerCase();

    // this stops sign up if the email already exists with any mix of capitals:
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (existingUser) {
      // this reuses the same email already in use reply from the catch block below:
      throw Object.assign(new Error("Email already in use"), { code: "P2002" });
    }

    // Validate employer profile fields if role is EMPLOYER
    if (role === 'EMPLOYER') {
      if (!employerProfile) {
        return res.status(400).json({ error: 'Employer profile information is required' });
      }
      if (!employerProfile.fullName || !employerProfile.workEmail || !employerProfile.role || !employerProfile.organisationName) {
        return res.status(400).json({ error: 'All employer profile fields are required: fullName, workEmail, role, organisationName' });
      }
      // Validate role enum
      const validRoles = ['MANAGER', 'HR', 'OWNER'];
      if (!validRoles.includes(employerProfile.role.toUpperCase())) {
        return res.status(400).json({ 
          error: `Invalid employer role. Must be one of: ${validRoles.join(', ')}` 
        });
      }
    }

    // Validate student profile fields if role is STUDENT:
    if (role === 'STUDENT') {
      if (!studentProfile) {
        return res.status(400).json({ error: 'Student profile information is required' });
      }
      if (!studentProfile.fullName || !studentProfile.universityId || !studentProfile.universityName || !studentProfile.visaType || !studentProfile.courseEndDate) {
        return res.status(400).json({ error: 'All student profile fields are required: fullName, universityId, universityName, visaType, courseEndDate' });
      }
      // the visa type must be one we know the rules for, so made up values like "Banana" are refused:
      if (!VISA_TYPES.includes(studentProfile.visaType)) {
        return res.status(400).json({ error: `Invalid visa type. Must be one of: ${VISA_TYPES.join(', ')}` });
      }
      // Validate course end date is in the future
      const courseEndDate = new Date(studentProfile.courseEndDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (courseEndDate <= today) {
        return res.status(400).json({ error: 'Course end date must be in the future' });
      }
      // Validate maxWeeklyHours if provided:
      if (studentProfile.maxWeeklyHours != null) {
        const hours = parseFloat(studentProfile.maxWeeklyHours);
        if (isNaN(hours) || hours < 1 || hours > 168) {
          return res.status(400).json({ error: 'Maximum weekly hours must be between 1 and 168' });
        }
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // when verification is switched off the account counts as verified straight away:
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        emailVerifiedAt: isEmailVerificationEnabled() ? null : new Date(),
      },
    });

    // Create student profile if role is STUDENT:
    if (role === 'STUDENT' && studentProfile) {
      try {
        const createdStudent = await prisma.student.create({
          data: {
            userId: user.id,
            fullName: studentProfile.fullName.trim(),
            universityId: studentProfile.universityId.trim(),
            universityName: studentProfile.universityName.trim(),
            visaType: studentProfile.visaType,
            courseEndDate: new Date(studentProfile.courseEndDate),
            maxWeeklyHours: studentProfile.maxWeeklyHours ? parseInt(studentProfile.maxWeeklyHours) : null,
          },
        });

        // AUDIT LOG - Student profile creation (wrap in try-catch to not fail registration if audit fails):
        try {
          await prisma.auditLog.create({
            data: {
              action: "CREATE_STUDENT_PROFILE",
              entityType: "Student",
              entityId: createdStudent.id,
              performedBy: user.id,
              universityId: createdStudent.universityId,
              metadata: {
                userId: user.id,
                fullName: createdStudent.fullName,
                universityId: createdStudent.universityId,
                universityName: createdStudent.universityName,
                visaType: createdStudent.visaType,
                courseEndDate: createdStudent.courseEndDate,
                maxWeeklyHours: createdStudent.maxWeeklyHours,
                createdDuringRegistration: true,
              },
            },
          });
        } catch (auditError) {
          // Log audit error but don't fail registration:
          console.error('Error creating audit log for student profile:', auditError);
        }
      } catch (profileError) {
        // If Student table doesn't exist yet (migration not run), continue without error:
        if (profileError.message?.includes('model `Student`') || profileError.message?.includes('does not exist')) {
          console.warn('Student table does not exist yet - migration may not have been run');
          // Continue without creating profile
        } else {
          console.error('Error creating student profile during registration:', profileError);
          console.error('Error details:', {
            code: profileError.code,
            message: profileError.message,
            meta: profileError.meta,
          });
          
          // Handle specific Prisma errors
          if (profileError.code === 'P2002') {
            // Unique constraint violation
            const target = profileError.meta?.target || [];
            if (target.includes('universityId')) {
              return res.status(409).json({ error: 'A student with this university ID already exists' });
            } else if (target.includes('userId')) {
              return res.status(409).json({ error: 'A profile already exists for this user' });
            }
            return res.status(409).json({ error: 'A student profile with this information already exists' });
          }
          
          // Re-throw to be caught by outer catch block
          throw profileError;
        }
      }
    }

    // Create employer profile if role is EMPLOYER
    if (role === 'EMPLOYER' && employerProfile) {
      try {
        // Get IP and user agent from request
        const ipAddress = getClientIp(req);
        const userAgent = req.headers['user-agent'] || 'Unknown';

        const createdEmployer = await prisma.employer.create({
          data: {
            userId: user.id,
            fullName: employerProfile.fullName,
            workEmail: employerProfile.workEmail,
            role: employerProfile.role.toUpperCase(),
            organisationName: employerProfile.organisationName,
            lastLogin: new Date(),
            lastLoginIp: ipAddress,
            lastLoginUserAgent: userAgent,
            acknowledgementIps: [ipAddress],
          },
        });

        // AUDIT LOG - Employer profile creation
        await prisma.auditLog.create({
          data: {
            action: "CREATE_EMPLOYER_PROFILE",
            entityType: "Employer",
            entityId: createdEmployer.id,
            performedBy: user.id,
            universityId: null,
            ipAddress,
            userAgent,
            metadata: {
              userId: user.id,
              fullName: employerProfile.fullName,
              workEmail: employerProfile.workEmail,
              role: employerProfile.role.toUpperCase(),
              organisationName: employerProfile.organisationName,
              createdDuringRegistration: true,
            },
          },
        });
      } catch (profileError) {
        // If Employer table doesn't exist yet (migration not run), continue without error
        if (!profileError.message?.includes('model `Employer`') && !profileError.message?.includes('does not exist')) {
          console.error('Error creating employer profile during registration:', profileError);
        }
      }
    }

    // AUDIT LOG - User registration
    // Note: entityId is Int, but User.id is UUID, so we use 0 and store userId in metadata
    await prisma.auditLog.create({
      data: {
        action: "USER_REGISTRATION",
        entityType: "User",
        entityId: 0, // User IDs are UUIDs, not integers
        performedBy: user.id, // User registers themselves
        universityId: null, // Registration doesn't belong to a university yet
        metadata: {
          userId: user.id, // Store actual UUID here
          email: user.email,
          role: user.role,
          success: true,
        },
      },
    });

    // this emails the verification link when verification is switched on:
    if (isEmailVerificationEnabled()) {
      await createAndSendVerification(prisma, user);
    }

    // the user is still logged in, but sharing actions wait until they verify:
    const token = signToken({ id: user.id, role: user.role });

    const response = {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerifiedAt: user.emailVerifiedAt,
      },
    };

    // Include verification message if enabled
    if (isEmailVerificationEnabled()) {
      response.message = "Registration successful. Please check your email to verify your account.";
      response.emailVerificationRequired = true;
    }

    res.status(201).json(response);
  } catch (error) {
    if (error.code === "P2002") {
      // Log failed registration attempt (duplicate email)
      try {
        await prisma.auditLog.create({
          data: {
            action: "USER_REGISTRATION",
            entityType: "User",
            entityId: 0, // No user ID for failed attempts
            performedBy: "SYSTEM",
            universityId: null,
            metadata: {
              email: req.body.email,
              role: req.body.role,
              success: false,
              reason: "Email already in use",
            },
          },
        });
      } catch (logError) {
        console.error("Failed to log registration attempt:", logError);
      }
      return res.status(409).json({ 
        success: false,
        error: {
          message: "Email already in use",
          code: "EMAIL_ALREADY_EXISTS",
          requestId: req.requestId || null,
          timestamp: new Date().toISOString(),
        }
      });
    }

    // Log failed registration attempt (other errors)
    try {
      await prisma.auditLog.create({
        data: {
          action: "USER_REGISTRATION",
          entityType: "User",
          entityId: 0,
          performedBy: "SYSTEM",
          universityId: null,
          metadata: {
            email: req.body.email || "unknown",
            role: req.body.role || "unknown",
            success: false,
            reason: "Internal server error",
          },
        },
      });
    } catch (logError) {
      console.error("Failed to log registration attempt:", logError);
    }

    console.error("REGISTER ERROR:", error);
    console.error("Error details:", {
      code: error.code,
      message: error.message,
      meta: error.meta,
      stack: error.stack,
    });
    
    // Return more specific error messages for debugging
    if (error.code === 'P2002') {
      return res.status(409).json({ 
        error: "Email already in use",
        code: "EMAIL_ALREADY_EXISTS"
      });
    }
    
    res.status(500).json({ 
      error: "Internal server error",
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});



// LOGIN
router.post("/login",
  authRateLimiter, // Stricter rate limiting for login
  validate([
    { field: 'email', validator: 'email' },
    { field: 'password', validator: 'required' }
  ]),
  async (req, res) => {
  try {
    const { password } = req.body;

    // this tidies the typed email so capitals and spaces do not matter at login:
    const email = req.body.email.trim().toLowerCase();

    // Explicitly select only fields that exist (lastLogin may not exist until migration is run)
    // this finds the account even if it was saved with capitals before this fix:
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        createdAt: true,
        emailVerifiedAt: true,
        // lastLogin: true, // Uncomment after migration
      }
    });
    if (!user) {
      // AUDIT LOG - Failed login (user not found)
      try {
        await prisma.auditLog.create({
          data: {
            action: "LOGIN_ATTEMPT",
            entityType: "User",
            entityId: 0, // No user ID for failed attempts
            performedBy: "SYSTEM",
            universityId: null,
            metadata: {
              email: email || "unknown",
              success: false,
              reason: "User not found",
            },
          },
        });
      } catch (logError) {
        console.error("Failed to log login attempt:", logError);
      }
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      // AUDIT LOG - Failed login (invalid password)
      try {
        await prisma.auditLog.create({
          data: {
            action: "LOGIN_ATTEMPT",
            entityType: "User",
            entityId: 0, // User IDs are UUIDs, not integers
            performedBy: user.id,
            universityId: null,
            metadata: {
              userId: user.id, // Store actual UUID here
              email: user.email,
              role: user.role,
              success: false,
              reason: "Invalid password",
            },
          },
        });
      } catch (logError) {
        console.error("Failed to log login attempt:", logError);
      }
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // AUDIT LOG - Successful login
    try {
      // Get student's universityId if user is a student
      let universityId = null;
      if (user.role === "STUDENT") {
        const student = await prisma.student.findUnique({
          where: { userId: user.id },
          select: { universityId: true },
        });
        if (student) {
          universityId = student.universityId;
        }
      }

      await prisma.auditLog.create({
        data: {
          action: "LOGIN_ATTEMPT",
          entityType: "User",
          entityId: 0, // User IDs are UUIDs, not integers
          performedBy: user.id,
          universityId: universityId,
          metadata: {
            userId: user.id, // Store actual UUID here
            email: user.email,
            role: user.role,
            success: true,
          },
        },
      });
    } catch (logError) {
      console.error("Failed to log login attempt:", logError);
    }

    // Update last login time (if field exists - migration may not be run yet)
    const ipAddress = getClientIp(req);
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });
    } catch (err) {
      // If lastLogin field doesn't exist yet (migration not run), continue without error
      // This allows the app to work before migration is run
      if (!err.message?.includes('Unknown argument `lastLogin`')) {
        console.error('Error updating lastLogin:', err);
      }
    }

    // Update employer last login if employer profile exists (if Employer table exists)
    if (user.role === "EMPLOYER") {
      try {
        const employer = await prisma.employer.findUnique({
          where: { userId: user.id },
        });
        if (employer) {
          const userAgent = req.headers['user-agent'] || 'Unknown';
          await prisma.employer.update({
            where: { userId: user.id },
            data: {
              lastLogin: new Date(),
              lastLoginIp: ipAddress,
              lastLoginUserAgent: userAgent,
            },
          });
        }
      } catch (err) {
        // If Employer table doesn't exist yet (migration not run), continue without error
        if (!err.message?.includes('model `Employer`') && !err.message?.includes('does not exist')) {
          console.error('Error updating employer lastLogin:', err);
        }
      }
    }

    const token = signToken({ id: user.id, role: user.role });

    res.json({ 
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerifiedAt: user.emailVerifiedAt,
      }
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// POST /auth/forgot-password - Request password reset:
router.post(
  "/forgot-password",
  passwordResetRateLimiter,
  validate([
    { field: 'email', validator: 'email' }
  ]),
  async (req, res) => {
    try {
      // this tidies the typed email so capitals do not matter for password resets:
      const email = req.body.email.trim().toLowerCase();

      // Explicitly select only fields that exist (lastLogin may not exist until migration is run):
      const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: {
          id: true,
          email: true,
          password: true,
          role: true,
          createdAt: true,
        }
      });

      // Don't reveal if user exists (security best practice):
      if (!user) {
        // Still return success to prevent email enumeration
        return res.json({
          success: true,
          message: "If an account with that email exists, a password reset link has been sent.",
        });
      }

      // Generate reset token
      const crypto = await import('crypto');
      const resetToken = crypto.default.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

      // Delete any existing reset tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      // Store only a hash of the token, so a leaked database can't be used
      // to reset anyone's password
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: hashResetToken(resetToken),
          expiresAt,
        },
      });

      // Email the link. The raw token only ever lives in this link; the
      // database keeps a hash of it (see hashResetToken).
      // FRONTEND_URL can list several origins for CORS, so use the first one.
      const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").split(",")[0].trim();
      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
      try {
        await sendPasswordResetEmail(user.email, resetUrl);
      } catch (emailError) {
        // Keep the response identical either way so it never reveals whether
        // the email exists; just record the failure for the server owner.
        console.error("PASSWORD RESET EMAIL FAILED:", emailError.message);
      }

      // AUDIT LOG
      const ipAddress = getClientIp(req);
      await prisma.auditLog.create({
        data: {
          action: "PASSWORD_RESET_REQUESTED",
          entityType: "User",
          entityId: 0,
          performedBy: user.id,
          universityId: null,
          ipAddress,
          metadata: {
            userId: user.id,
            email: user.email,
            success: true,
          },
        },
      });

      res.json({
        success: true,
        message: "If an account with that email exists, a password reset link has been sent.",
      });
    } catch (error) {
      console.error("FORGOT PASSWORD ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);


// POST /auth/reset-password - Reset password with token:
router.post(
  "/reset-password",
  authRateLimiter,
  validate([
    { field: 'token', validator: 'required' },
    { field: 'password', validator: 'password' }
  ]),
  async (req, res) => {
    try {
      const { token, password } = req.body;

      // Find reset token (the database stores its hash)
      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token: hashResetToken(token) },
        include: { user: true },
      });

      if (!resetToken) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Check if token is expired
      if (new Date() > resetToken.expiresAt) {
        await prisma.passwordResetToken.delete({
          where: { id: resetToken.id },
        });
        return res.status(400).json({ error: "Reset token has expired" });
      }

      // Check if token has been used
      if (resetToken.used) {
        return res.status(400).json({ error: "This reset token has already been used" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update user password
      await prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      });

      // Mark token as used
      await prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      });

      // Delete all other reset tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: {
          userId: resetToken.userId,
          id: { not: resetToken.id },
        },
      });

      // AUDIT LOG:
      const ipAddress = getClientIp(req);
      await prisma.auditLog.create({
        data: {
          action: "PASSWORD_RESET_COMPLETED",
          entityType: "User",
          entityId: 0,
          performedBy: resetToken.userId,
          universityId: null,
          ipAddress,
          metadata: {
            userId: resetToken.userId,
            email: resetToken.user.email,
            success: true,
          },
        },
      });

      res.json({
        success: true,
        message: "Password has been reset successfully. You can now log in with your new password.",
      });
    } catch (error) {
      console.error("RESET PASSWORD ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// POST /auth/verify-email - the verify page sends the token from the emailed link:
// it is a POST because it changes the account, and it works without being logged in:
router.post(
  "/verify-email",
  authRateLimiter,
  validate([
    { field: 'token', validator: 'required' }
  ]),
  async (req, res) => {
    try {
      const user = await verifyEmailToken(prisma, req.body.token);

      // AUDIT LOG - this records when the email was proven:
      await prisma.auditLog.create({
        data: {
          action: "EMAIL_VERIFIED",
          entityType: "User",
          entityId: 0,
          performedBy: user.id,
          universityId: null,
          ipAddress: getClientIp(req),
          metadata: { userId: user.id, email: user.email },
        },
      });

      res.json({
        success: true,
        message: "Your email address is verified.",
        email: user.email,
      });
    } catch (error) {
      // a bad or old link gets a clear message the page can show:
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          success: false,
          error: {
            message: error.message,
            code: error.code,
            requestId: req.requestId || null,
          },
        });
      }
      console.error("VERIFY EMAIL ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);


// POST /auth/resend-verification - a logged in user asks for a new link:
// it has its own strict limit so nobody can flood an inbox:
router.post(
  "/resend-verification",
  requireAuth,
  verificationEmailRateLimiter,
  async (req, res) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, email: true, emailVerifiedAt: true },
      });

      if (!user) {
        return res.status(404).json({ error: "Account not found" });
      }

      // nothing to send if they already verified:
      if (user.emailVerifiedAt) {
        return res.json({ success: true, alreadyVerified: true, message: "Your email address is already verified." });
      }

      await createAndSendVerification(prisma, user);

      res.json({
        success: true,
        message: `We sent a new verification link to ${user.email}.`,
      });
    } catch (error) {
      console.error("RESEND VERIFICATION ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;

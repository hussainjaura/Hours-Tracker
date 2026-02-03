import express from "express";
import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import prisma from "../prisma.js";
import { signToken } from "../utils/jwt.js";
import requireAuth from "../middleware/requireAuth.js";
import { validate } from "../middleware/validation.js";

const router = express.Router();

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        student: true,
      },
    });

    res.json(user);
  } catch (error) {
    console.error("ME ERROR:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});



// REGISTER
router.post("/register", 
  validate([
    { field: 'email', validator: 'email' },
    { field: 'password', validator: 'required' },
    { field: 'role', validator: 'role' }
  ]),
  async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
      },
    });

    // AUDIT LOG - User registration
    await prisma.auditLog.create({
      data: {
        action: "USER_REGISTRATION",
        entityType: "User",
        entityId: user.id,
        performedBy: user.id, // User registers themselves
        universityId: null, // Registration doesn't belong to a university yet
        metadata: {
          email: user.email,
          role: user.role,
          success: true,
        },
      },
    });

    const token = signToken({ id: user.id, role: user.role });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
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
      return res.status(409).json({ error: "Email already in use" });
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
    res.status(500).json({ error: "Internal server error" });
  }
});



// LOGIN
router.post("/login",
  validate([
    { field: 'email', validator: 'email' },
    { field: 'password', validator: 'required' }
  ]),
  async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
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
            entityId: user.id,
            performedBy: user.id,
            universityId: null,
            metadata: {
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
          entityId: user.id,
          performedBy: user.id,
          universityId: universityId,
          metadata: {
            email: user.email,
            role: user.role,
            success: true,
          },
        },
      });
    } catch (logError) {
      console.error("Failed to log login attempt:", logError);
    }

    const token = signToken({ id: user.id, role: user.role });

    res.json({ token });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

import express from "express";
import prisma from "../prisma.js";
import { authenticate, authorizeRoles } from "../middleware/auth.js";
import { getWorkEligibility } from "../utils/workEligibility.js";
import { validate, validatePositiveNumber } from "../middleware/validation.js";
import { logComplianceRule } from "../utils/auditLogger.js";

const router = express.Router();

/**
 * GET /employer/profile - Get employer profile
 */
router.get(
  "/profile",
  authenticate,
  authorizeRoles("EMPLOYER"),
  async (req, res) => {
    try {
      const employer = await prisma.employer.findUnique({
        where: { userId: req.user.id },
        include: {
          user: {
            select: {
              email: true,
              createdAt: true,
              lastLogin: true,
            },
          },
        },
      });

      if (!employer) {
        return res.status(404).json({ error: "Profile not found. Please create your profile first." });
      }

      res.json(employer);
    } catch (error) {
      console.error("GET EMPLOYER PROFILE ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Profile creation removed - profiles are now created during registration

// Profile update removed - profiles are created during registration and cannot be changed

router.post(
  "/check-eligibility",
  authenticate,
  authorizeRoles("EMPLOYER"),
  validate([
    { field: 'universityId', validator: 'required' }
  ]),
  async (req, res) => {
    const { universityId, requestedHours } = req.body;
    
    // Validate requestedHours if provided (optional)
    if (requestedHours != null && requestedHours !== '') {
      const hoursValidation = validatePositiveNumber(requestedHours, 'requestedHours', { min: 0.5, max: 168 });
      if (!hoursValidation.valid) {
        return res.status(400).json({ error: hoursValidation.error });
      }
      req.body.requestedHours = hoursValidation.number;
    }

    try {
      const student = await prisma.student.findUnique({
        where: { universityId },
      });

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      const eligibility = await getWorkEligibility(prisma, student);

      // AUDIT LOG - Layer 4: System-generated Compliance Rule
      await logComplianceRule(prisma, student, eligibility, req);

      // Additional audit log for eligibility check
      await prisma.auditLog.create({
        data: {
          action: "CHECK_ELIGIBILITY_COMPLIANCE",
          entityType: "Student",
          entityId: student.id,
          performedBy: req.user.id,
          universityId: student.universityId,
          metadata: {
            eligibility,
            checkedBy: "EMPLOYER",
            checkedAt: new Date(),
          },
        },
      });

      res.json({
        universityId,
        requestedHours,
        ...eligibility,
      });
    } catch (err) {
      console.error("CHECK ELIGIBILITY ERROR:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;

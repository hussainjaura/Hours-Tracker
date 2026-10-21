import express from "express";
import prisma from "../prisma.js";
import { authenticate, authorizeRoles } from "../middleware/auth.js";
import { getWorkEligibility } from "../utils/workEligibility.js";
import { findRelationship } from "../utils/access.js";
import { getClientIp } from "../utils/auditLogger.js";
import { validate, validateDate, validatePositiveNumber } from "../middleware/validation.js";

const router = express.Router();


// GET STUDENT PROFILE:
router.get(
  "/profile",
  authenticate,
  authorizeRoles("STUDENT"),
  async (req, res) => {
    try {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
      });

      if (!student) {
        return res.status(404).json({ error: "Student profile not found" });
      }

      res.json(student);
    } catch (err) {
      console.error("GET PROFILE ERROR:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Profile creation removed - profiles are now created during registration

// EMPLOYER CHECK:
router.get(
  "/:universityId",
  authenticate,
  authorizeRoles("EMPLOYER"),
  async (req, res) => {
    const { universityId } = req.params;

    try {
      const student = await prisma.student.findUnique({
        where: { universityId },
      });

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      // Until the student accepts this employer, only confirm the ID exists
      // so the employer can send an access request. No personal details.
      const relationship = await findRelationship(prisma, student.id, req.user.id);
      if (relationship?.status !== "ACTIVE") {
        return res.json({
          universityId: student.universityId,
          accessStatus: relationship?.status || "NONE",
        });
      }

      const eligibility = await getWorkEligibility(prisma, student);

      // AUDIT LOG - Track eligibility checks:
      await prisma.auditLog.create({
        data: {
          action: "CHECK_ELIGIBILITY",
          // this saves where the check came from, as evidence in the audit pack:
          ipAddress: getClientIp(req),
          entityType: "Student",
          entityId: student.id,
          performedBy: req.user.id,
          universityId: student.universityId,
          metadata: {
            eligibility,
            checkedBy: "EMPLOYER",
          },
        },
      });

      res.json({
        accessStatus: "ACTIVE",
        fullName: student.fullName,
        universityId: student.universityId,
        universityName: student.universityName,
        visaType: student.visaType,
        ...eligibility,
      });
    } catch (error) {
      console.error("VISA CHECK ERROR:", error);
      res.status(500).json({ error: "Failed to evaluate visa rules" });
    }
  }
);

export default router;

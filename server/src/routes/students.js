import express from "express";
import prisma from "../prisma.js";
import { authenticate, authorizeRoles } from "../middleware/auth.js";
import { getWorkEligibility } from "../utils/workEligibility.js";

const router = express.Router();

/**
 * CREATE STUDENT PROFILE (ONCE)
 */
router.post(
  "/profile",
  authenticate,
  authorizeRoles("STUDENT"),
  async (req, res) => {
    try {
      const { universityId, visaType, maxWeeklyHours, courseEndDate } = req.body;

      if (!universityId || !visaType || !courseEndDate) {
        return res.status(400).json({
          error: "universityId, visaType, and courseEndDate are required",
        });
      }

      // prevent duplicate profile
      const existingStudent = await prisma.student.findUnique({
        where: { userId: req.user.id },
      });

      if (existingStudent) {
        return res.status(409).json({
          error: "Student profile already exists",
        });
      }

      const student = await prisma.student.create({
        data: {
          userId: req.user.id,
          universityId,
          visaType,
          maxWeeklyHours, // optional
          courseEndDate: new Date(courseEndDate),
        },
      });

      // AUDIT LOG
      await prisma.auditLog.create({
        data: {
          action: "CREATE_STUDENT_PROFILE",
          entityType: "Student",
          entityId: student.id,
          performedBy: req.user.id,
          universityId: student.universityId,
          metadata: {
            visaType: student.visaType,
            courseEndDate: student.courseEndDate,
            maxWeeklyHours: student.maxWeeklyHours,
          },
        },
      });

      res.status(201).json(student);
    } catch (err) {
      console.error("CREATE PROFILE ERROR:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * EMPLOYER CHECK
 */
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

      const eligibility = await getWorkEligibility(prisma, student);

      // AUDIT LOG - Track eligibility checks
      await prisma.auditLog.create({
        data: {
          action: "CHECK_ELIGIBILITY",
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
        universityId: student.universityId,
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

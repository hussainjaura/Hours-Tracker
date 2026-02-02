import express from "express";
import prisma from "../prisma.js";
import { authenticate, authorizeRoles } from "../middleware/auth.js";
import { getWorkEligibility } from "../utils/workEligibility.js";

const router = express.Router();

router.post(
  "/check-eligibility",
  authenticate,
  authorizeRoles("EMPLOYER"),
  async (req, res) => {
    const { universityId, requestedHours } = req.body;

    if (!universityId || requestedHours == null) {
      return res.status(400).json({
        error: "universityId and requestedHours are required",
      });
    }

    try {
      const student = await prisma.student.findUnique({
        where: { universityId },
      });

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      const eligibility = await getWorkEligibility(
        prisma,
        student,
        requestedHours
      );

      // AUDIT LOG - Track eligibility checks with requested hours
      await prisma.auditLog.create({
        data: {
          action: "CHECK_ELIGIBILITY_WITH_HOURS",
          entityType: "Student",
          entityId: student.id,
          performedBy: req.user.id,
          universityId: student.universityId,
          metadata: {
            requestedHours,
            eligibility,
            checkedBy: "EMPLOYER",
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

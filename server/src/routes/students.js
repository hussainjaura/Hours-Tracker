import express from "express";
import prisma from "../prisma.js";
import { authenticate, authorizeRoles } from "../middleware/auth.js";
import { getWorkEligibility } from "../utils/workEligibility.js";

const router = express.Router();



// this is where you create student profile!
router.post(
  "/profile",
  authenticate,
  authorizeRoles("STUDENT"),
  async (req, res) => {
    try {
      const { universityId, visaType, maxWeeklyHours, courseEndDate } = req.body;

      if (!universityId || !visaType || !courseEndDate) {
        return res.status(400).json({ error: "Missing required fields" });
      }

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
          maxWeeklyHours,
          courseEndDate: new Date(courseEndDate),
        },
      });

      res.status(201).json(student);
    } catch (err) {
      console.error("CREATE PROFILE ERROR:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);



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

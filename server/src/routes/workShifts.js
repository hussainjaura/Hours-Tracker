import express from "express";
import prisma from "../prisma.js";
import { authenticate, authorizeRoles } from "../middleware/auth.js";
import { getWeeklyHours, checkWeeklyLimit, getHoursInRange } from "../utils/weeklyHours.js";
import { getWorkEligibility } from "../utils/workEligibility.js";
import { validate, validateDate } from "../middleware/validation.js";
import { detectViolation, logViolation } from "../utils/compliance.js";

const router = express.Router();

/**
 * ============================================
 * EMPLOYER ROUTES - Log Work Hours
 * ============================================
 */

/**
 * POST /work-shifts - Employer logs work hours for a student
 * Creates a PENDING shift that student must confirm
 */
router.post(
  "/",
  authenticate,
  authorizeRoles("EMPLOYER"),
  validate([
    { field: 'studentUniversityId', validator: 'required' },
    { field: 'date', validator: 'date' },
    { field: 'hours', validator: 'positiveNumber', options: { max: 24 } }
  ]),
  async (req, res) => {
    try {
      const { studentUniversityId, date, hours, description } = req.body;

      // 1️⃣ Find student
      const student = await prisma.student.findUnique({
        where: { universityId: studentUniversityId },
      });

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      // 2️⃣ Verify employer-student relationship exists and is active
      const relationship = await prisma.studentEmployer.findUnique({
        where: {
          studentId_employerId: {
            studentId: student.id,
            employerId: req.user.id,
          },
        },
      });

      if (!relationship || relationship.status !== "ACTIVE") {
        return res.status(403).json({
          error: "You must have an active relationship with this student to log hours",
        });
      }

      // 3️⃣ Check work eligibility and weekly limits
      const eligibility = await getWorkEligibility(prisma, student, hours);
      
      if (!eligibility.canWork) {
        return res.status(400).json({
          error: `Student cannot work: ${eligibility.reason}`,
          eligibility,
        });
      }

      // 4️⃣ Check weekly limit
      const limitCheck = await checkWeeklyLimit(
        prisma,
        student.id,
        hours,
        new Date(date),
        eligibility.allowedWeeklyHours
      );

      if (limitCheck.wouldExceed) {
        const isTermTime = eligibility.inTermTime;
        const errorMessage = isTermTime
          ? `⚠️ TERM TIME RESTRICTION: Cannot log more than 20 hours per week during term time. Current: ${limitCheck.currentHours}h, Adding: ${hours}h, Limit: ${limitCheck.allowedWeeklyHours}h. This is ILLEGAL and violates UK student visa regulations.`
          : `This would exceed weekly limit. Current: ${limitCheck.currentHours}h, Adding: ${hours}h, Limit: ${limitCheck.allowedWeeklyHours}h`;
        
        return res.status(400).json({
          success: false,
          error: {
            message: errorMessage,
            code: isTermTime ? "TERM_TIME_LIMIT_EXCEEDED" : "WEEKLY_LIMIT_EXCEEDED",
            limitCheck,
            eligibility,
            isTermTime,
          },
        });
      }

      // 5️⃣ Create work shift
      const workShift = await prisma.workShift.create({
        data: {
          studentId: student.id,
          employerId: req.user.id,
          date: date,
          hours: hours,
          description: description || null,
          status: "PENDING",
        },
      });

      // 6️⃣ AUDIT LOG
      await prisma.auditLog.create({
        data: {
          action: "CREATE_WORK_SHIFT",
          entityType: "WorkShift",
          entityId: workShift.id,
          performedBy: req.user.id,
          universityId: student.universityId,
          metadata: {
            studentUniversityId,
            date: workShift.date,
            hours: Number(workShift.hours),
            status: workShift.status,
            employerId: req.user.id,
            limitCheck,
          },
        },
      });

      res.status(201).json({
        workShift,
        message: "Work shift logged. Awaiting student confirmation.",
        limitCheck,
      });
    } catch (error) {
      console.error("CREATE WORK SHIFT ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * GET /work-shifts/student/:universityId - Employer views shifts for a student
 */
router.get(
  "/student/:universityId",
  authenticate,
  authorizeRoles("EMPLOYER"),
  async (req, res) => {
    try {
      const { universityId } = req.params;
      const { startDate, endDate, status } = req.query;

      const student = await prisma.student.findUnique({
        where: { universityId },
      });

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      // Verify relationship
      const relationship = await prisma.studentEmployer.findUnique({
        where: {
          studentId_employerId: {
            studentId: student.id,
            employerId: req.user.id,
          },
        },
      });

      if (!relationship) {
        return res.status(403).json({
          error: "You don't have access to this student's work shifts",
        });
      }

      // Build query
      const where = {
        studentId: student.id,
        employerId: req.user.id,
      };

      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate) where.date.lte = new Date(endDate);
      }

      if (status) {
        where.status = status;
      }

      const shifts = await prisma.workShift.findMany({
        where,
        orderBy: { date: "desc" },
      });

      res.json(shifts);
    } catch (error) {
      console.error("GET WORK SHIFTS ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * ============================================
 * STUDENT ROUTES - View and Confirm Hours
 * ============================================
 */

/**
 * GET /work-shifts/me - Student views their own work shifts
 */
router.get(
  "/me",
  authenticate,
  authorizeRoles("STUDENT"),
  async (req, res) => {
    try {
      const { startDate, endDate, status } = req.query;

      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
      });

      if (!student) {
        return res.status(404).json({ error: "Student profile not found" });
      }

      // Build query
      const where = {
        studentId: student.id,
      };

      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate) where.date.lte = new Date(endDate);
      }

      if (status) {
        where.status = status;
      }

      const shifts = await prisma.workShift.findMany({
        where,
        orderBy: { date: "desc" },
        include: {
          student: {
            select: {
              universityId: true,
              fullName: true,
            },
          },
        },
      });

      res.json(shifts);
    } catch (error) {
      console.error("GET MY WORK SHIFTS ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * GET /work-shifts/me/weekly - Student views weekly hours summary
 */
router.get(
  "/me/weekly",
  authenticate,
  authorizeRoles("STUDENT"),
  async (req, res) => {
    try {
      const { weekStart } = req.query;

      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
      });

      if (!student) {
        return res.status(404).json({ error: "Student profile not found" });
      }

      const date = weekStart ? new Date(weekStart) : new Date();
      const weeklyData = await getWeeklyHours(prisma, student.id, date);

      // Get eligibility for context
      const eligibility = await getWorkEligibility(prisma, student);

      res.json({
        ...weeklyData,
        allowedWeeklyHours: eligibility.allowedWeeklyHours,
        remaining: Math.max(
          0,
          eligibility.allowedWeeklyHours - weeklyData.totalHours
        ),
        inTermTime: eligibility.inTermTime,
        activeTerm: eligibility.activeTerm,
      });
    } catch (error) {
      console.error("GET WEEKLY HOURS ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * PUT /work-shifts/:shiftId/confirm - Student confirms a work shift
 */
router.put(
  "/:shiftId/confirm",
  authenticate,
  authorizeRoles("STUDENT"),
  async (req, res) => {
    try {
      const shiftId = Number(req.params.shiftId);

      if (isNaN(shiftId)) {
        return res.status(400).json({ error: "Invalid shift ID" });
      }

      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
      });

      if (!student) {
        return res.status(404).json({ error: "Student profile not found" });
      }

      // Get shift and verify ownership
      const shift = await prisma.workShift.findUnique({
        where: { id: shiftId },
      });

      if (!shift) {
        return res.status(404).json({ error: "Work shift not found" });
      }

      if (shift.studentId !== student.id) {
        return res.status(403).json({
          error: "This work shift does not belong to you",
        });
      }

      if (shift.status === "CONFIRMED") {
        return res.status(400).json({
          error: "This shift is already confirmed",
        });
      }

      // Check if confirming would exceed weekly limit
      const eligibility = await getWorkEligibility(prisma, student);
      const limitCheck = await checkWeeklyLimit(
        prisma,
        student.id,
        Number(shift.hours),
        shift.date,
        eligibility.allowedWeeklyHours
      );

      if (limitCheck.wouldExceed) {
        return res.status(400).json({
          error: `Confirming this shift would exceed weekly limit. Current: ${limitCheck.currentHours}h, Adding: ${Number(shift.hours)}h, Limit: ${limitCheck.allowedWeeklyHours}h`,
          limitCheck,
        });
      }

      // Update shift status
      const updatedShift = await prisma.workShift.update({
        where: { id: shiftId },
        data: { status: "CONFIRMED" },
      });

      // AUDIT LOG
      await prisma.auditLog.create({
        data: {
          action: "CONFIRM_WORK_SHIFT",
          entityType: "WorkShift",
          entityId: shift.id,
          performedBy: req.user.id,
          universityId: student.universityId,
          metadata: {
            date: shift.date,
            hours: Number(shift.hours),
            previousStatus: shift.status,
            newStatus: "CONFIRMED",
            limitCheck,
          },
        },
      });

      // 🔥 COMPLIANCE CHECK: Detect and log violations
      let violation = null;
      try {
        violation = await detectViolation(prisma, updatedShift, student);
        if (violation) {
          await logViolation(prisma, violation, updatedShift, student);
        }
      } catch (error) {
        console.error("VIOLATION DETECTION ERROR:", error);
        // Don't fail the request if violation detection fails
      }

      res.json({
        workShift: updatedShift,
        message: "Work shift confirmed",
        limitCheck,
        violation: violation ? {
          type: violation.violationType,
          severity: violation.severity,
          description: violation.description,
        } : null,
      });
    } catch (error) {
      console.error("CONFIRM WORK SHIFT ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * PUT /work-shifts/:shiftId/reject - Student rejects a work shift
 */
router.put(
  "/:shiftId/reject",
  authenticate,
  authorizeRoles("STUDENT"),
  async (req, res) => {
    try {
      const shiftId = Number(req.params.shiftId);
      const { reason } = req.body;

      if (isNaN(shiftId)) {
        return res.status(400).json({ error: "Invalid shift ID" });
      }

      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
      });

      if (!student) {
        return res.status(404).json({ error: "Student profile not found" });
      }

      const shift = await prisma.workShift.findUnique({
        where: { id: shiftId },
      });

      if (!shift) {
        return res.status(404).json({ error: "Work shift not found" });
      }

      if (shift.studentId !== student.id) {
        return res.status(403).json({
          error: "This work shift does not belong to you",
        });
      }

      if (shift.status === "REJECTED") {
        return res.status(400).json({
          error: "This shift is already rejected",
        });
      }

      const updatedShift = await prisma.workShift.update({
        where: { id: shiftId },
        data: { status: "REJECTED" },
      });

      // AUDIT LOG
      await prisma.auditLog.create({
        data: {
          action: "REJECT_WORK_SHIFT",
          entityType: "WorkShift",
          entityId: shift.id,
          performedBy: req.user.id,
          universityId: student.universityId,
          metadata: {
            date: shift.date,
            hours: Number(shift.hours),
            previousStatus: shift.status,
            newStatus: "REJECTED",
            reason: reason || null,
          },
        },
      });

      res.json({
        workShift: updatedShift,
        message: "Work shift rejected",
      });
    } catch (error) {
      console.error("REJECT WORK SHIFT ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * GET /work-shifts/me/history - Student views work history with weekly breakdown
 */
router.get(
  "/me/history",
  authenticate,
  authorizeRoles("STUDENT"),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
      });

      if (!student) {
        return res.status(404).json({ error: "Student profile not found" });
      }

      const start = startDate
        ? new Date(startDate)
        : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Default: 90 days ago
      const end = endDate ? new Date(endDate) : new Date();

      const history = await getHoursInRange(prisma, student.id, start, end);

      res.json(history);
    } catch (error) {
      console.error("GET WORK HISTORY ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;


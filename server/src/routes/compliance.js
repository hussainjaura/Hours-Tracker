/**
 * Compliance Routes
 * 
 * Endpoints for compliance monitoring, violation tracking, and reporting
 */

import express from "express";
import prisma from "../prisma.js";
import { authenticate, authorizeRoles } from "../middleware/auth.js";
import { getWeeklyHours, getWeekStart } from "../utils/weeklyHours.js";
import { getWorkEligibility } from "../utils/workEligibility.js";
import { getHoursInRange } from "../utils/weeklyHours.js";
import {
  detectViolation,
  logViolation,
  checkWeekForViolations,
  getStudentViolationStats,
  getEmployerViolationStats,
} from "../utils/compliance.js";

const router = express.Router();


// WEEKLY HOUR SUMMARIES:


// GET /compliance/weekly-summary/:universityId
// Get weekly hours summary for a student (ADMIN, EMPLOYER, or STUDENT for own):
router.get(
  "/weekly-summary/:universityId",
  authenticate,
  authorizeRoles("ADMIN", "EMPLOYER", "STUDENT"),
  async (req, res) => {
    try {
      const { universityId } = req.params;
      const { weekStart } = req.query;

      // Find student
      const student = await prisma.student.findUnique({
        where: { universityId },
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      });

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      // Authorization check
      if (req.user.role === "STUDENT" && student.userId !== req.user.id) {
        return res.status(403).json({ error: "You can only view your own summary" });
      }

      if (req.user.role === "EMPLOYER") {
        // Check if employer has relationship with student
        const relationship = await prisma.studentEmployer.findUnique({
          where: {
            studentId_employerId: {
              studentId: student.id,
              employerId: req.user.id,
            },
          },
        });

        // Only an accepted (ACTIVE) link gives access; a pending request doesn't
        if (!relationship || relationship.status !== "ACTIVE") {
          return res.status(403).json({
            error: "You don't have access to this student's data",
          });
        }
      }

      // Get week data
      const date = weekStart ? new Date(weekStart) : new Date();
      const weeklyData = await getWeeklyHours(prisma, student.id, date);
      const eligibility = await getWorkEligibility(prisma, student);

      // Check for violations in this week
      const violations = await prisma.complianceViolation.findMany({
        where: {
          studentId: student.id,
          weekStart: weeklyData.weekStart,
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({
        student: {
          universityId: student.universityId,
          email: student.user.email,
        },
        week: {
          weekStart: weeklyData.weekStart,
          weekEnd: weeklyData.weekEnd,
        },
        hours: {
          total: weeklyData.totalHours,
          allowed: eligibility.allowedWeeklyHours,
          remaining: Math.max(0, eligibility.allowedWeeklyHours - weeklyData.totalHours),
          excess: Math.max(0, weeklyData.totalHours - eligibility.allowedWeeklyHours),
        },
        context: {
          inTermTime: eligibility.inTermTime,
          activeTerm: eligibility.activeTerm,
          courseEndDate: student.courseEndDate,
        },
        shifts: weeklyData.shifts,
        violations: violations.length > 0 ? violations : null,
        compliant: violations.length === 0 && weeklyData.totalHours <= eligibility.allowedWeeklyHours,
      });
    } catch (error) {
      console.error("GET WEEKLY SUMMARY ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);


// GET /compliance/weekly-summary/me
// Student views their own weekly summary:
router.get(
  "/weekly-summary/me",
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
      const eligibility = await getWorkEligibility(prisma, student);

      const violations = await prisma.complianceViolation.findMany({
        where: {
          studentId: student.id,
          weekStart: weeklyData.weekStart,
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({
        week: {
          weekStart: weeklyData.weekStart,
          weekEnd: weeklyData.weekEnd,
        },
        hours: {
          total: weeklyData.totalHours,
          allowed: eligibility.allowedWeeklyHours,
          remaining: Math.max(0, eligibility.allowedWeeklyHours - weeklyData.totalHours),
          excess: Math.max(0, weeklyData.totalHours - eligibility.allowedWeeklyHours),
        },
        context: {
          inTermTime: eligibility.inTermTime,
          activeTerm: eligibility.activeTerm,
        },
        shifts: weeklyData.shifts,
        violations: violations.length > 0 ? violations : null,
        compliant: violations.length === 0 && weeklyData.totalHours <= eligibility.allowedWeeklyHours,
      });
    } catch (error) {
      console.error("GET MY WEEKLY SUMMARY ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);


// COMPLIANCE VIOLATIONS:


// GET /compliance/violations
// Get all violations (ADMIN only) or filtered by student/employer:
router.get(
  "/violations",
  authenticate,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    try {
      const { studentId, employerId, severity, violationType, startDate, endDate, limit = 50 } = req.query;

      const where = {};

      if (studentId) where.studentId = Number(studentId);
      if (employerId) where.employerId = employerId;
      if (severity) where.severity = severity;
      if (violationType) where.violationType = violationType;

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      const violations = await prisma.complianceViolation.findMany({
        where,
        include: {
          student: {
            include: {
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
          workShift: {
            select: {
              id: true,
              date: true,
              hours: true,
              description: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: Number(limit),
      });

      res.json({
        count: violations.length,
        violations,
      });
    } catch (error) {
      console.error("GET VIOLATIONS ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);


// GET /compliance/violations/student/:universityId
// Get violations for a specific student:
router.get(
  "/violations/student/:universityId",
  authenticate,
  authorizeRoles("ADMIN", "EMPLOYER", "STUDENT"),
  async (req, res) => {
    try {
      const { universityId } = req.params;
      const { startDate, endDate, limit = 50 } = req.query;

      const student = await prisma.student.findUnique({
        where: { universityId },
      });

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      // Authorization:
      if (req.user.role === "STUDENT" && student.userId !== req.user.id) {
        return res.status(403).json({ error: "You can only view your own violations" });
      }

      if (req.user.role === "EMPLOYER") {
        const relationship = await prisma.studentEmployer.findUnique({
          where: {
            studentId_employerId: {
              studentId: student.id,
              employerId: req.user.id,
            },
          },
        });

        // Only an accepted (ACTIVE) link gives access; a pending request doesn't:
        if (!relationship || relationship.status !== "ACTIVE") {
          return res.status(403).json({ error: "You don't have access to this student" });
        }
      }

      const where = { studentId: student.id };

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = new Date(startDate);
        if (endDate) where.createdAt.lte = new Date(endDate);
      }

      const violations = await prisma.complianceViolation.findMany({
        where,
        include: {
          workShift: {
            select: {
              id: true,
              date: true,
              hours: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: Number(limit),
      });

      const stats = await getStudentViolationStats(prisma, student.id);

      res.json({
        student: {
          universityId: student.universityId,
          id: student.id,
        },
        violations,
        stats,
      });
    } catch (error) {
      console.error("GET STUDENT VIOLATIONS ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);


// GET /compliance/violations/me
// Student views their own violations:
router.get(
  "/violations/me",
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

      const violations = await prisma.complianceViolation.findMany({
        where: { studentId: student.id },
        include: {
          workShift: {
            select: {
              id: true,
              date: true,
              hours: true,
              description: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const stats = await getStudentViolationStats(prisma, student.id);

      res.json({
        violations,
        stats,
      });
    } catch (error) {
      console.error("GET MY VIOLATIONS ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);


// STUDENT WORK HISTORY:


// GET /compliance/work-history/:universityId
// Get comprehensive work history for a student:
router.get(
  "/work-history/:universityId",
  authenticate,
  authorizeRoles("ADMIN", "EMPLOYER", "STUDENT"),
  async (req, res) => {
    try {
      const { universityId } = req.params;
      const { startDate, endDate } = req.query;

      const student = await prisma.student.findUnique({
        where: { universityId },
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      });

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      // Authorization
      if (req.user.role === "STUDENT" && student.userId !== req.user.id) {
        return res.status(403).json({ error: "You can only view your own history" });
      }

      if (req.user.role === "EMPLOYER") {
        const relationship = await prisma.studentEmployer.findUnique({
          where: {
            studentId_employerId: {
              studentId: student.id,
              employerId: req.user.id,
            },
          },
        });

        // Only an accepted (ACTIVE) link gives access; a pending request doesn't
        if (!relationship || relationship.status !== "ACTIVE") {
          return res.status(403).json({ error: "You don't have access to this student" });
        }
      }

      const start = startDate
        ? new Date(startDate)
        : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // Default: 1 year ago
      const end = endDate ? new Date(endDate) : new Date();

      const history = await getHoursInRange(prisma, student.id, start, end);

      // Get all violations in this period
      const violations = await prisma.complianceViolation.findMany({
        where: {
          studentId: student.id,
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({
        student: {
          universityId: student.universityId,
          email: student.user.email,
          visaType: student.visaType,
          courseEndDate: student.courseEndDate,
        },
        period: {
          startDate: start,
          endDate: end,
        },
        summary: {
          totalHours: history.totalHours,
          totalShifts: history.shifts.length,
          totalWeeks: Object.keys(history.weeklyBreakdown).length,
          totalViolations: violations.length,
        },
        weeklyBreakdown: history.weeklyBreakdown,
        shifts: history.shifts,
        violations: violations.length > 0 ? violations : null,
      });
    } catch (error) {
      console.error("GET WORK HISTORY ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

//EMPLOYER ACTIVITY REPORTS:


// GET /compliance/employer-activity/:employerId
// Get activity report for an employer (ADMIN only):
router.get(
  "/employer-activity/:employerId",
  authenticate,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    try {
      const { employerId } = req.params;
      const { startDate, endDate } = req.query;

      // Verify employer exists
      const employer = await prisma.user.findUnique({
        where: { id: employerId },
        select: {
          id: true,
          email: true,
          role: true,
        },
      });

      if (!employer || employer.role !== "EMPLOYER") {
        return res.status(404).json({ error: "Employer not found" });
      }

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      // Get all shifts logged by this employer
      const shifts = await prisma.workShift.findMany({
        where: {
          employerId,
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        include: {
          student: {
            include: {
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Get violations caused by this employer:
      const violations = await prisma.complianceViolation.findMany({
        where: {
          employerId,
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        include: {
          student: {
            include: {
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Get relationships
      const relationships = await prisma.studentEmployer.findMany({
        where: {
          employerId,
        },
        include: {
          student: {
            include: {
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
      });

      // Calculate statistics:
      const totalShifts = shifts.length;
      const confirmedShifts = shifts.filter((s) => s.status === "CONFIRMED").length;
      const pendingShifts = shifts.filter((s) => s.status === "PENDING").length;
      const rejectedShifts = shifts.filter((s) => s.status === "REJECTED").length;
      const totalHours = shifts
        .filter((s) => s.status === "CONFIRMED")
        .reduce((sum, s) => sum + Number(s.hours), 0);

      const violationStats = await getEmployerViolationStats(prisma, employerId);

      // Group by student
      const byStudent = {};
      shifts.forEach((shift) => {
        const key = shift.student.universityId;
        if (!byStudent[key]) {
          byStudent[key] = {
            student: {
              universityId: shift.student.universityId,
              email: shift.student.user.email,
            },
            shifts: [],
            totalHours: 0,
            violations: [],
          };
        }
        byStudent[key].shifts.push(shift);
        if (shift.status === "CONFIRMED") {
          byStudent[key].totalHours += Number(shift.hours);
        }
      });

      violations.forEach((v) => {
        const key = v.student.universityId;
        if (byStudent[key]) {
          byStudent[key].violations.push(v);
        }
      });

      res.json({
        employer: {
          id: employer.id,
          email: employer.email,
        },
        period: {
          startDate: start,
          endDate: end,
        },
        summary: {
          totalShifts,
          confirmedShifts,
          pendingShifts,
          rejectedShifts,
          totalHours: parseFloat(totalHours.toFixed(2)),
          totalViolations: violations.length,
          activeStudents: relationships.filter((r) => r.status === "ACTIVE").length,
          totalStudents: relationships.length,
        },
        violationStats,
        byStudent: Object.values(byStudent),
        recentViolations: violations.slice(0, 20),
        relationships: relationships.map((r) => ({
          student: {
            universityId: r.student.universityId,
            email: r.student.user.email,
          },
          status: r.status,
          linkedAt: r.linkedAt,
        })),
      });
    } catch (error) {
      console.error("GET EMPLOYER ACTIVITY ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);


// GET /compliance/employer-activity/me:
// Employer views their own activity report:
router.get(
  "/employer-activity/me",
  authenticate,
  authorizeRoles("EMPLOYER"),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const shifts = await prisma.workShift.findMany({
        where: {
          employerId: req.user.id,
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        include: {
          student: {
            include: {
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const violations = await prisma.complianceViolation.findMany({
        where: {
          employerId: req.user.id,
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        include: {
          student: {
            include: {
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const totalShifts = shifts.length;
      const confirmedShifts = shifts.filter((s) => s.status === "CONFIRMED").length;
      const totalHours = shifts
        .filter((s) => s.status === "CONFIRMED")
        .reduce((sum, s) => sum + Number(s.hours), 0);

      res.json({
        period: {
          startDate: start,
          endDate: end,
        },
        summary: {
          totalShifts,
          confirmedShifts,
          totalHours: parseFloat(totalHours.toFixed(2)),
          totalViolations: violations.length,
        },
        violations: violations.slice(0, 20),
        recentShifts: shifts.slice(0, 20),
      });
    } catch (error) {
      console.error("GET MY EMPLOYER ACTIVITY ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);


// ADMIN COMPLIANCE DASHBOARD:


// GET /compliance/dashboard
// Get compliance overview dashboard (ADMIN only):
router.get(
  "/dashboard",
  authenticate,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      // Get all violations in period:
      const violations = await prisma.complianceViolation.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: end,
          },
        },
        include: {
          student: {
            include: {
              user: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Get all students with violations:
      const studentsWithViolations = await prisma.student.findMany({
        where: {
          violations: {
            some: {
              createdAt: {
                gte: start,
                lte: end,
              },
            },
          },
        },
        include: {
          user: {
            select: {
              email: true,
            },
          },
          _count: {
            select: {
              violations: true,
            },
          },
        },
      });

      // Get all employers with violations:
      const employersWithViolations = await prisma.user.findMany({
        where: {
          role: "EMPLOYER",
          id: {
            in: [...new Set(violations.map((v) => v.employerId).filter(Boolean))],
          },
        },
        select: {
          id: true,
          email: true,
        },
      });

      // Calculate statistics:
      const stats = {
        totalViolations: violations.length,
        byType: {},
        bySeverity: {},
        byStudent: {},
        byEmployer: {},
        critical: violations.filter((v) => v.severity === "CRITICAL").length,
        high: violations.filter((v) => v.severity === "HIGH").length,
        medium: violations.filter((v) => v.severity === "MEDIUM").length,
        low: violations.filter((v) => v.severity === "LOW").length,
      };

      violations.forEach((v) => {
        stats.byType[v.violationType] = (stats.byType[v.violationType] || 0) + 1;
        stats.bySeverity[v.severity] = (stats.bySeverity[v.severity] || 0) + 1;
        
        const studentKey = v.student.universityId;
        stats.byStudent[studentKey] = (stats.byStudent[studentKey] || 0) + 1;
        
        if (v.employerId) {
          stats.byEmployer[v.employerId] = (stats.byEmployer[v.employerId] || 0) + 1;
        }
      });

      res.json({
        period: {
          startDate: start,
          endDate: end,
        },
        stats,
        studentsWithViolations: studentsWithViolations.map((s) => ({
          universityId: s.universityId,
          email: s.user.email,
          violationCount: s._count.violations,
        })),
        employersWithViolations: employersWithViolations.map((e) => ({
          id: e.id,
          email: e.email,
          violationCount: stats.byEmployer[e.id] || 0,
        })),
        recentViolations: violations.slice(0, 50),
      });
    } catch (error) {
      console.error("GET COMPLIANCE DASHBOARD ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;


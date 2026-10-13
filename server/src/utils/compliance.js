// Compliance and Violation Detection Utilities 
// Functions to detect, log, and track compliance violations:

import { getWeeklyHours, getWeekStart, getWeekEnd } from "./weeklyHours.js";
import { getWorkEligibility } from "./workEligibility.js";

/**
 * Detect if a confirmed shift creates a violation
 * @param {PrismaClient} prisma - Prisma client instance
 * @param {Object} shift - WorkShift object
 * @param {Object} student - Student object
 * @returns {Promise<Object|null>} - Violation object or null if no violation
 */
export async function detectViolation(prisma, shift, student) {
  if (shift.status !== "CONFIRMED") {
    return null; // Only check confirmed shifts
  }

  const shiftDate = new Date(shift.date);
  const weekStart = getWeekStart(shiftDate);
  const weekEnd = getWeekEnd(shiftDate);

  // Get eligibility and weekly hours
  const eligibility = await getWorkEligibility(prisma, student);
  const weeklyData = await getWeeklyHours(prisma, student.id, shiftDate);

  // Check for violations
  let violation = null;

  // 1. Check if course has ended
  if (student.courseEndDate && shiftDate > student.courseEndDate) {
    violation = {
      violationType: "COURSE_ENDED",
      severity: "CRITICAL",
      description: `Student worked after course end date (${student.courseEndDate.toISOString().split('T')[0]})`,
      causedBy: shiftDate <= new Date(shift.createdAt) ? "EMPLOYER" : "STUDENT",
    };
  }
  // 2. Check weekly limit exceeded
  else if (weeklyData.totalHours > eligibility.allowedWeeklyHours) {
    const excessHours = weeklyData.totalHours - eligibility.allowedWeeklyHours;
    
    // Determine severity based on excess
    let severity = "MEDIUM";
    if (excessHours > 10) {
      severity = "CRITICAL";
    } else if (excessHours > 5) {
      severity = "HIGH";
    } else if (excessHours <= 2) {
      severity = "LOW";
    }

    violation = {
      violationType: eligibility.inTermTime ? "TERM_LIMIT_EXCEEDED" : "WEEKLY_LIMIT_EXCEEDED",
      severity,
      allowedHours: eligibility.allowedWeeklyHours,
      actualHours: weeklyData.totalHours,
      excessHours: parseFloat(excessHours.toFixed(2)),
      inTermTime: eligibility.inTermTime,
      activeTermName: eligibility.activeTerm,
      description: `Weekly limit exceeded by ${excessHours.toFixed(2)} hours. Allowed: ${eligibility.allowedWeeklyHours}h, Actual: ${weeklyData.totalHours.toFixed(2)}h`,
      causedBy: "STUDENT", // Student confirmed the shift
    };
  }

  if (violation) {
    return {
      ...violation,
      weekStart,
      weekEnd,
      courseEndDate: student.courseEndDate,
      metadata: {
        eligibility,
        weeklyData,
        shiftId: shift.id,
        shiftDate: shift.date,
        shiftHours: Number(shift.hours),
      },
    };
  }

  return null;
}

/**
 * Log a compliance violation to the database
 * @param {PrismaClient} prisma - Prisma client instance
 * @param {Object} violationData - Violation data from detectViolation
 * @param {Object} shift - WorkShift object
 * @param {Object} student - Student object
 * @returns {Promise<Object>} - Created violation record
 */
export async function logViolation(prisma, violationData, shift, student) {
  return await prisma.complianceViolation.create({
    data: {
      studentId: student.id,
      employerId: shift.employerId,
      workShiftId: shift.id,
      violationType: violationData.violationType,
      severity: violationData.severity,
      weekStart: violationData.weekStart,
      weekEnd: violationData.weekEnd,
      allowedHours: violationData.allowedHours ? Number(violationData.allowedHours) : 0,
      actualHours: violationData.actualHours ? Number(violationData.actualHours) : 0,
      excessHours: violationData.excessHours ? Number(violationData.excessHours) : 0,
      inTermTime: violationData.inTermTime || false,
      activeTermName: violationData.activeTermName || null,
      courseEndDate: violationData.courseEndDate || null,
      causedBy: violationData.causedBy,
      description: violationData.description,
      metadata: violationData.metadata || {},
    },
  });
}

/**
 * Check all confirmed shifts for a student in a given week and detect violations
 * @param {PrismaClient} prisma - Prisma client instance
 * @param {number} studentId - Student ID
 * @param {Date} weekStart - Start of week to check
 * @returns {Promise<Array>} - Array of violations found
 */
export async function checkWeekForViolations(prisma, studentId, weekStart) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student) {
    throw new Error("Student not found");
  }

  const weekEnd = getWeekEnd(weekStart);
  
  // Get all confirmed shifts for the week
  const shifts = await prisma.workShift.findMany({
    where: {
      studentId,
      date: {
        gte: weekStart,
        lte: weekEnd,
      },
      status: "CONFIRMED",
    },
    orderBy: {
      date: "asc",
    },
  });

  // Check each shift for violations
  const violations = [];
  for (const shift of shifts) {
    const violation = await detectViolation(prisma, shift, student);
    if (violation) {
      // Check if violation already logged
      const existing = await prisma.complianceViolation.findFirst({
        where: {
          studentId,
          workShiftId: shift.id,
          weekStart,
        },
      });

      if (!existing) {
        const logged = await logViolation(prisma, violation, shift, student);
        violations.push(logged);
      }
    }
  }

  return violations;
}

/**
 * Get violation statistics for a student
 * @param {PrismaClient} prisma - Prisma client instance
 * @param {number} studentId - Student ID
 * @returns {Promise<Object>} - Violation statistics
 */
export async function getStudentViolationStats(prisma, studentId) {
  const violations = await prisma.complianceViolation.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
  });

  const stats = {
    total: violations.length,
    byType: {},
    bySeverity: {},
    recent: violations.slice(0, 10),
    firstViolation: violations.length > 0 ? violations[violations.length - 1].createdAt : null,
    lastViolation: violations.length > 0 ? violations[0].createdAt : null,
  };

  violations.forEach((v) => {
    stats.byType[v.violationType] = (stats.byType[v.violationType] || 0) + 1;
    stats.bySeverity[v.severity] = (stats.bySeverity[v.severity] || 0) + 1;
  });

  return stats;
}

/**
 * Get violation statistics for an employer
 * @param {PrismaClient} prisma - Prisma client instance
 * @param {string} employerId - Employer user ID
 * @returns {Promise<Object>} - Violation statistics
 */
export async function getEmployerViolationStats(prisma, employerId) {
  const violations = await prisma.complianceViolation.findMany({
    where: { employerId },
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

  const stats = {
    total: violations.length,
    byType: {},
    bySeverity: {},
    byStudent: {},
    recent: violations.slice(0, 20),
    firstViolation: violations.length > 0 ? violations[violations.length - 1].createdAt : null,
    lastViolation: violations.length > 0 ? violations[0].createdAt : null,
  };

  violations.forEach((v) => {
    stats.byType[v.violationType] = (stats.byType[v.violationType] || 0) + 1;
    stats.bySeverity[v.severity] = (stats.bySeverity[v.severity] || 0) + 1;
    
    const studentKey = `${v.student.universityId} (${v.student.user.email})`;
    stats.byStudent[studentKey] = (stats.byStudent[studentKey] || 0) + 1;
  });

  return stats;
}


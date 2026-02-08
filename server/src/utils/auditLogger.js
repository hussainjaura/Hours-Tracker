/**
 * Comprehensive Audit Logger Utility
 * Implements all 6 layers of audit trail for Home Office compliance
 */

import prisma from "../prisma.js";

/**
 * Get client IP address from request
 */
export function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

/**
 * Get user agent from request
 */
export function getUserAgent(req) {
  return req.headers["user-agent"] || "unknown";
}

/**
 * Layer 1: Identity & Context
 * Captures: Student name, Employer name, Visa category, Academic year, University name
 */
export async function logIdentityContext(prisma, action, entityType, entityId, performedBy, universityId, contextData, req = null) {
  const metadata = {
    // Layer 1: Identity & Context
    studentName: contextData.studentName,
    employerName: contextData.employerName,
    visaCategory: contextData.visaType || contextData.visaCategory,
    academicYear: contextData.academicYear,
    universityName: contextData.universityName,
    universityCode: contextData.universityCode || universityId,
    ...contextData.additionalContext,
  };

  return await prisma.auditLog.create({
    data: {
      action,
      entityType,
      entityId,
      performedBy,
      universityId,
      metadata,
      ipAddress: req ? getClientIp(req) : null,
      userAgent: req ? getUserAgent(req) : null,
    },
  });
}

/**
 * Layer 2: Term-date Declaration
 * Captures: Term dates, Student declaration text, Confirmation timestamp
 */
export async function logTermDeclaration(prisma, term, student, user, declarationText, req = null) {
  const declaration = declarationText || 
    "I confirm these term dates are accurate to the best of my knowledge.";

  return await prisma.auditLog.create({
    data: {
      action: "STUDENT_DECLARE_TERM_DATES",
      entityType: "Term",
      entityId: term.id,
      performedBy: user.id,
      universityId: student.universityId,
      metadata: {
        // Layer 1: Identity
        studentName: user.email,
        universityName: student.universityId,
        visaCategory: student.visaType,
        academicYear: term.academicYear,
        // Layer 2: Declaration
        termName: term.name,
        termStartDate: term.startDate,
        termEndDate: term.endDate,
        declarationSource: "student-provided",
      },
      declarationText: declaration,
      ipAddress: req ? getClientIp(req) : null,
      userAgent: req ? getUserAgent(req) : null,
    },
  });
}

/**
 * Layer 3: Employer Acknowledgement
 * Captures: Employer viewing dates, Acknowledgement text, Timestamp
 */
export async function logEmployerAcknowledgement(prisma, relationship, student, employer, acknowledgementText, req = null) {
  const acknowledgement = acknowledgementText || 
    "We have relied on the information provided and applied the correct working restrictions.";

  // Get student's terms for context
  const terms = await prisma.term.findMany({
    where: { studentId: student.id },
    orderBy: { startDate: "asc" },
  });

  return await prisma.auditLog.create({
    data: {
      action: "EMPLOYER_ACKNOWLEDGE_DECLARATIONS",
      entityType: "StudentEmployer",
      entityId: relationship.id,
      performedBy: employer.id,
      universityId: student.universityId,
      metadata: {
        // Layer 1: Identity
        studentName: student.universityId,
        employerName: employer.email,
        visaCategory: student.visaType,
        universityName: student.universityId,
        // Layer 3: Acknowledgement
        acknowledgedTerms: terms.map(t => ({
          name: t.name,
          academicYear: t.academicYear,
          startDate: t.startDate,
          endDate: t.endDate,
        })),
        courseEndDate: student.courseEndDate,
      },
      acknowledgementText: acknowledgement,
      ipAddress: req ? getClientIp(req) : null,
      userAgent: req ? getUserAgent(req) : null,
    },
  });
}

/**
 * Layer 4: System-generated Compliance Rule
 * Captures: Applied rule, Date range, Source data
 */
export async function logComplianceRule(prisma, student, ruleData, req = null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find active term if in term time
  const activeTerm = await prisma.term.findFirst({
    where: {
      studentId: student.id,
      startDate: { lte: today },
      endDate: { gte: today },
    },
  });

  const complianceRule = {
    ruleApplied: ruleData.inTermTime 
      ? "Term time: max 20 hours/week"
      : "Holiday period: full-time allowed",
    dateRange: activeTerm ? {
      start: activeTerm.startDate,
      end: activeTerm.endDate,
    } : null,
    allowedWeeklyHours: ruleData.allowedWeeklyHours,
    inTermTime: ruleData.inTermTime,
    activeTermName: activeTerm?.name || null,
    source: "student-declaration",
    sourceVersion: "1.0",
    calculatedAt: new Date(),
  };

  return await prisma.auditLog.create({
    data: {
      action: "SYSTEM_GENERATE_COMPLIANCE_RULE",
      entityType: "Student",
      entityId: student.id,
      performedBy: "SYSTEM", // System-generated
      universityId: student.universityId,
      metadata: {
        // Layer 1: Identity
        studentName: student.universityId,
        visaCategory: student.visaType,
        // Layer 4: Compliance Rule
        ruleDetails: complianceRule,
      },
      complianceRule: complianceRule,
      ipAddress: req ? getClientIp(req) : null,
      userAgent: req ? getUserAgent(req) : null,
    },
  });
}

/**
 * Layer 5: Change History
 * Captures: Previous values, New values, Who changed, When, Reason
 */
export async function logChangeHistory(prisma, action, entityType, entityId, performedBy, universityId, oldValues, newValues, reason = null, req = null) {
  return await prisma.auditLog.create({
    data: {
      action,
      entityType,
      entityId,
      performedBy,
      universityId,
      metadata: {
        // Layer 1: Identity (if available)
        ...(oldValues.studentName && { studentName: oldValues.studentName }),
        ...(oldValues.employerName && { employerName: oldValues.employerName }),
        // Layer 5: Change History
        changeReason: reason,
        previousValues: oldValues,
        newValues: newValues,
        changedAt: new Date(),
      },
      changeHistory: {
        before: oldValues,
        after: newValues,
        reason: reason,
        changedBy: performedBy,
        changedAt: new Date(),
      },
      ipAddress: req ? getClientIp(req) : null,
      userAgent: req ? getUserAgent(req) : null,
    },
  });
}

/**
 * Comprehensive audit log creator - combines all layers when applicable
 */
export async function createComprehensiveAuditLog(prisma, options, req = null) {
  const {
    action,
    entityType,
    entityId,
    performedBy,
    universityId,
    // Layer 1: Identity & Context
    identityContext = {},
    // Layer 2: Declaration (if applicable)
    declarationText = null,
    // Layer 3: Acknowledgement (if applicable)
    acknowledgementText = null,
    // Layer 4: Compliance Rule (if applicable)
    complianceRule = null,
    // Layer 5: Change History (if applicable)
    changeHistory = null,
    // Additional metadata
    additionalMetadata = {},
  } = options;

  const metadata = {
    // Layer 1: Identity & Context
    ...identityContext,
    // Additional metadata
    ...additionalMetadata,
  };

  return await prisma.auditLog.create({
    data: {
      action,
      entityType,
      entityId,
      performedBy,
      universityId,
      metadata,
      declarationText,
      acknowledgementText,
      complianceRule: complianceRule ? JSON.parse(JSON.stringify(complianceRule)) : null,
      changeHistory: changeHistory ? JSON.parse(JSON.stringify(changeHistory)) : null,
      ipAddress: req ? getClientIp(req) : null,
      userAgent: req ? getUserAgent(req) : null,
    },
  });
}

/**
 * Get audit trail for a student (for export/display)
 */
export async function getStudentAuditTrail(prisma, studentId, universityId) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!student) {
    throw new Error("Student not found");
  }

  // Get all audit logs for this student
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      universityId: universityId,
    },
    orderBy: { createdAt: "asc" },
  });

  // Get student's terms
  const terms = await prisma.term.findMany({
    where: { studentId: student.id },
    orderBy: { startDate: "asc" },
  });

  // Get relationships with acknowledgements (include employer profile)
  const relationships = await prisma.studentEmployer.findMany({
    where: { studentId: student.id },
    include: {
      student: {
        include: {
          user: {
            select: { email: true },
          },
        },
      },
    },
  });

  // Fetch employer profiles for all unique employer IDs
  const employerIds = [...new Set(relationships.map(rel => rel.employerId))];
  const employerProfiles = await prisma.employer.findMany({
    where: {
      userId: { in: employerIds },
    },
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  // Create a map for quick lookup
  const employerMap = new Map();
  employerProfiles.forEach(emp => {
    employerMap.set(emp.userId, emp);
  });

  // Organize by layers
  const auditTrail = {
    // Layer 1: Identity & Context
    identity: {
      studentName: student.user?.email || student.universityId,
      universityId: student.universityId,
      visaType: student.visaType,
      courseEndDate: student.courseEndDate,
    },
    // Layer 2: Term Declarations
    declarations: terms.map(term => ({
      term: {
        name: term.name,
        academicYear: term.academicYear,
        startDate: term.startDate,
        endDate: term.endDate,
      },
      declaredAt: term.createdAt,
      confirmedAt: term.confirmedAt,
      confirmedBy: term.confirmedBy,
      declarationLogs: auditLogs.filter(log => 
        log.entityType === "Term" && 
        log.entityId === term.id &&
        log.action.includes("DECLARE")
      ),
    })),
    // Layer 3: Employer Acknowledgements
    acknowledgements: relationships
      .filter(rel => rel.acknowledgedAt)
      .map(rel => {
        const employerProfile = employerMap.get(rel.employerId);
        return {
          employerId: rel.employerId,
          employerName: employerProfile?.fullName || 'Unknown',
          organisationName: employerProfile?.organisationName || 'Unknown Organisation',
          workEmail: employerProfile?.workEmail || employerProfile?.user?.email || 'N/A',
          acknowledgedAt: rel.acknowledgedAt,
          acknowledgedBy: rel.acknowledgedBy,
          acknowledgementLogs: auditLogs.filter(log =>
            log.entityType === "StudentEmployer" &&
            log.entityId === rel.id &&
            log.action.includes("ACKNOWLEDGE")
          ),
        };
      }),
    // Layer 4: Compliance Rules
    complianceRules: auditLogs.filter(log =>
      log.action === "SYSTEM_GENERATE_COMPLIANCE_RULE" ||
      log.action === "CHECK_ELIGIBILITY_COMPLIANCE"
    ),
    // Layer 5: Change History
    changeHistory: auditLogs.filter(log => log.changeHistory !== null),
    // All logs
    allLogs: auditLogs,
  };

  return auditTrail;
}

/**
 * Get audit trail for an employer-student relationship
 */
export async function getRelationshipAuditTrail(prisma, relationshipId) {
  const relationship = await prisma.studentEmployer.findUnique({
    where: { id: relationshipId },
    include: {
      student: {
        include: {
          user: {
            select: { email: true },
          },
        },
      },
    },
  });

  if (!relationship) {
    throw new Error("Relationship not found");
  }

  // Get all audit logs related to this relationship
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entityType: "StudentEmployer", entityId: relationshipId },
        { universityId: relationship.student.universityId },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  return {
    relationship: {
      id: relationship.id,
      studentId: relationship.studentId,
      employerId: relationship.employerId,
      status: relationship.status,
      linkedAt: relationship.linkedAt,
      acknowledgedAt: relationship.acknowledgedAt,
      acknowledgedBy: relationship.acknowledgedBy,
    },
    student: {
      universityId: relationship.student.universityId,
      visaType: relationship.student.visaType,
      courseEndDate: relationship.student.courseEndDate,
    },
    auditLogs,
  };
}

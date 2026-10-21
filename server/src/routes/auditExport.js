/**
 * Audit Pack Export Routes
 * Generates PDF/ZIP exports of audit trails for Home Office compliance
 */

import express from "express";
import prisma from "../prisma.js";
import { authenticate, authorizeRoles } from "../middleware/auth.js";
import { ACKNOWLEDGEMENT_TEXT } from "../utils/auditLogger.js";
import { getWorkEligibility } from "../utils/workEligibility.js";
import { findResetNotices } from "../utils/acknowledgements.js";
import {
  generateStudentAuditPackPDF,
  generateRelationshipAuditPackPDF,
  formatDay,
} from "../utils/pdfGenerator.js";

const router = express.Router();

const DISCLAIMER =
  "ISC Audit records the term dates a student declares and the acknowledgements their employers give. " +
  "It does not track hours worked, and it does not replace payroll records, right to work checks or legal advice. " +
  "This document is a record of what was declared and agreed in ISC Audit, for compliance evidence purposes only.";

// the PDF lists this many recent events; the JSON export keeps every one:
const HISTORY_LIMIT = 200;

// these events are not useful evidence, so they are left out of the history:
const HIDDEN_ACTIONS = ["LOGIN_ATTEMPT", "DISMISS_REJECTION_NOTICE"];

// this turns the status codes into words a reader understands:
const STATUS_LABELS = {
  PENDING: "Waiting for the student",
  ACTIVE: "Active",
  REJECTED: "Declined by the student",
  INACTIVE: "Removed by the student",
};


// NAME HELPERS:

// this looks up names for a list of user IDs, so the PDF never shows a long ID code:
async function loadNames(userIds) {
  const ids = [...new Set(userIds.filter((id) => id && id !== "SYSTEM"))];
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    include: { student: true, employer: true },
  });

  // a student shows their name, an employer shows their name and organisation:
  const names = { SYSTEM: "ISC Audit system" };
  users.forEach((user) => {
    if (user.student) {
      names[user.id] = user.student.fullName || user.email;
    } else if (user.employer) {
      names[user.id] = user.employer.organisationName
        ? `${user.employer.fullName}, ${user.employer.organisationName}`
        : user.employer.fullName;
    } else {
      names[user.id] = user.email;
    }
  });
  return names;
}

// this finds a name, or says it is unknown instead of printing the ID:
const nameOf = (names, id) => names[id] || "Unknown user";


// HISTORY HELPERS:

// this turns a saved term (like "AUTUMN") into normal words (like "Autumn"):
const termLabel = (name) => (name ? name.charAt(0) + name.slice(1).toLowerCase() : "Term");

// this tidies saved reasons like "Student changed the AUTUMN term" into "Student changed the Autumn term":
const prettyTerms = (text) => (text ? text.replace(/\b(AUTUMN|SPRING|SUMMER)\b/g, termLabel) : text);

// this describes what changed in a term edit, like "End date changed from 11 Dec to 18 Dec":
function describeTermChange(changeHistory) {
  const before = changeHistory?.before || {};
  const after = changeHistory?.after || {};
  const changes = [];
  if (before.startDate !== after.startDate) changes.push(`start date changed from ${formatDay(before.startDate)} to ${formatDay(after.startDate)}`);
  if (before.endDate !== after.endDate) changes.push(`end date changed from ${formatDay(before.endDate)} to ${formatDay(after.endDate)}`);
  if (before.academicYear !== after.academicYear) changes.push(`academic year changed from ${before.academicYear || "not set"} to ${after.academicYear || "not set"}`);
  if (before.courseLevel !== after.courseLevel) changes.push("course level changed");
  if (before.name !== after.name) changes.push(`renamed from ${termLabel(before.name)} to ${termLabel(after.name)}`);
  const text = changes.join("; ") || "No date changes";
  return `${termLabel(after.name || before.name)} term: ${text}.`;
}

// this turns one audit log into a readable row: what happened and the key details:
// names is used to show the employer's name when the log only saved their ID:
function describeLog(log, names) {
  const meta = log.metadata || {};
  const employer = meta.employerId ? nameOf(names, meta.employerId) : null;
  const dates = (start, end) => `${formatDay(start)} to ${formatDay(end)}`;

  switch (log.action) {
    case "CREATE_STUDENT_PROFILE":
      return { event: "Student profile created", details: `${meta.universityName || "University not given"}. Course ends ${formatDay(meta.courseEndDate)}.` };
    case "STUDENT_DECLARE_TERM_DATES":
      // the same log is written when a term is added and when it is confirmed, so the saved words tell them apart:
      return { event: /not confirmed yet/i.test(log.declarationText || "") ? "Term dates added" : "Term dates confirmed", details: `${termLabel(meta.termName)} ${meta.academicYear || ""}: ${dates(meta.termStartDate, meta.termEndDate)}. "${log.declarationText || ""}"` };
    case "CREATE_TERM_FROM_TEMPLATE":
      return { event: "Term added from template", details: `${termLabel(meta.termName)}: ${dates(meta.startDate, meta.endDate)}${meta.datesEdited ? " (dates edited by the student)" : ""}.` };
    case "UPDATE_TERM":
      return { event: "Term dates changed", details: describeTermChange(log.changeHistory) };
    case "DELETE_TERM":
      return { event: "Term deleted", details: `${termLabel(meta.termName)}: ${dates(meta.startDate, meta.endDate)}.` };
    case "REQUEST_STUDENT_ACCESS":
      return { event: "Access requested", details: "The employer asked to see the student's term dates." };
    case "ACCEPT_EMPLOYER_ACCESS":
      return { event: "Access accepted", details: employer ? `The student gave ${employer} access.` : "The student gave the employer access." };
    case "REJECT_EMPLOYER_ACCESS":
      return { event: "Access declined", details: employer ? `The student declined ${employer}.` : "The student declined the request." };
    case "DEACTIVATE_EMPLOYER_ACCESS":
      return { event: "Access removed", details: employer ? `The student removed ${employer}'s access.` : "The student removed the employer's access." };
    case "REMOVE_STUDENT_RELATIONSHIP":
      return { event: "Student removed", details: "The employer removed this student from their list." };
    case "EMPLOYER_ACKNOWLEDGE_DECLARATIONS":
      return { event: "Term dates acknowledged", details: `"${log.acknowledgementText || ACKNOWLEDGEMENT_TEXT}"` };
    case "ACKNOWLEDGEMENT_RESET":
      return { event: "Acknowledgement cleared", details: `${prettyTerms(meta.reason) || "The term dates changed"}${employer ? `, so ${employer} must acknowledge again` : ""}.` };
    case "CHECK_ELIGIBILITY":
    case "CHECK_ELIGIBILITY_COMPLIANCE": {
      const result = meta.eligibility || {};
      return { event: "Working rules checked", details: result.allowedWeeklyHours != null ? `Limit shown: ${result.allowedWeeklyHours} hours a week${result.inTermTime ? " (term time)" : ""}.` : "" };
    }
    case "SYSTEM_GENERATE_COMPLIANCE_RULE": {
      const rule = log.complianceRule || {};
      return { event: "Working rule recorded", details: rule.allowedWeeklyHours != null ? `${rule.allowedWeeklyHours} hours a week${rule.activeTermName ? ` during the ${termLabel(rule.activeTermName)} term` : ""}.` : "" };
    }
    default:
      // any other event still shows, with its code turned into words:
      return { event: termLabel(log.action.replace(/_/g, " ")), details: "" };
  }
}

// this builds the history rows for the PDF, keeping only the newest ones if there are many:
function buildHistory(logs, names) {
  const shown = logs.filter((log) => !HIDDEN_ACTIONS.includes(log.action));
  const rows = shown.map((log) => ({
    at: log.createdAt,
    ...describeLog(log, names),
    by: nameOf(names, log.performedBy),
    ip: log.ipAddress,
    action: log.action,
  }));
  return { rows: rows.slice(-HISTORY_LIMIT), total: rows.length };
}


// RULE AND TERM HELPERS:

// this explains the working rule that applies today, in the words shown on the PDF:
async function buildCurrentRule(student) {
  const eligibility = await getWorkEligibility(prisma, student);

  // the status changes with the course end, missing dates, term time and holidays:
  let statusLabel = "Holiday";
  if (!eligibility.canWork && eligibility.reason === "Course has ended") statusLabel = "Course ended";
  else if (eligibility.termsMissing) statusLabel = "No term dates";
  else if (eligibility.inTermTime) statusLabel = `${termLabel(eligibility.activeTerm)} term`;

  const fullTime = !eligibility.inTermTime && !eligibility.termsMissing && !eligibility.personalLimitApplied && eligibility.canWork;
  return {
    statusLabel,
    limitLabel: fullTime ? "Full time" : `${eligibility.allowedWeeklyHours} hours`,
    reason: eligibility.reason,
    ...eligibility,
  };
}

// this lists the student's terms with the weekly limit for each one:
// a student's own lower limit is used when it is stricter than the law:
function buildTerms(terms, student) {
  return terms.map((term) => {
    const legalLimit = term.courseLevel === "BELOW_DEGREE" ? 10 : 20;
    const ownLimit = student.maxWeeklyHours;
    return {
      name: termLabel(term.name),
      academicYear: term.academicYear,
      startDate: term.startDate,
      endDate: term.endDate,
      courseLevel: term.courseLevel,
      weeklyLimit: ownLimit && ownLimit < legalLimit ? ownLimit : legalLimit,
      confirmedAt: term.confirmedAt,
    };
  });
}

// this builds a short reference so the PDF can be quoted, like ISC-A-U1001-20261021-1805:
function buildReference(kind, universityId, date) {
  const stamp = date.toISOString().slice(0, 16).replace(/[-:T]/g, "").replace(/^(\d{8})(\d{4})$/, "$1-$2");
  return `ISC-${kind}-${universityId}-${stamp}`;
}

// this sends the pack as a PDF or as JSON, depending on ?format=:
async function sendPack(res, req, pack, makePdf, fileName) {
  if ((req.query.format || "json") === "pdf") {
    const pdfBuffer = await makePdf(pack);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}.pdf"`);
    return res.send(pdfBuffer);
  }
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}.json"`);
  res.json(pack);
}


/**
 * GET /audit-export/student - Student exports their own audit pack:
 */
router.get(
  "/student",
  authenticate,
  authorizeRoles("STUDENT"),
  async (req, res) => {
    try {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
        include: { user: { select: { email: true } } },
      });

      if (!student) {
        return res.status(404).json({ error: "Student profile not found" });
      }

      // everything recorded about this student, oldest first:
      const [terms, relationships, logs] = await Promise.all([
        prisma.term.findMany({ where: { studentId: student.id }, orderBy: { startDate: "asc" } }),
        prisma.studentEmployer.findMany({ where: { studentId: student.id, status: "ACTIVE" } }),
        prisma.auditLog.findMany({ where: { universityId: student.universityId }, orderBy: { createdAt: "asc" } }),
      ]);

      // this loads the employer profiles and every name the history mentions:
      const employerProfiles = await prisma.employer.findMany({
        where: { userId: { in: relationships.map((rel) => rel.employerId) } },
      });
      const names = await loadNames([
        ...logs.map((log) => log.performedBy),
        ...logs.map((log) => log.metadata?.employerId),
      ]);
      const resetNotices = await findResetNotices(prisma, relationships);

      // one row per employer with access, saying if they have acknowledged:
      const employers = relationships.map((rel) => {
        const profile = employerProfiles.find((emp) => emp.userId === rel.employerId);
        return {
          name: profile?.fullName || nameOf(names, rel.employerId),
          organisation: profile?.organisationName || null,
          workEmail: profile?.workEmail || null,
          acknowledgedAt: rel.acknowledgedAt,
          resetAt: resetNotices[rel.id]?.resetAt || null,
        };
      });

      const builtTerms = buildTerms(terms, student);
      const history = buildHistory(logs, names);
      const generatedAt = new Date();

      const pack = {
        exportType: "STUDENT_AUDIT_PACK",
        reference: buildReference("S", student.universityId, generatedAt),
        generatedAt,
        disclaimer: DISCLAIMER,
        student: {
          name: student.fullName || student.user?.email || student.universityId,
          email: student.user?.email,
          universityName: student.universityName,
          universityId: student.universityId,
          visaType: student.visaType,
          courseEndDate: student.courseEndDate,
          maxWeeklyHours: student.maxWeeklyHours,
        },
        currentRule: await buildCurrentRule(student),
        terms: builtTerms,
        employers,
        acknowledgementText: ACKNOWLEDGEMENT_TEXT,
        counts: {
          terms: builtTerms.length,
          confirmedTerms: builtTerms.filter((term) => term.confirmedAt).length,
          activeEmployers: employers.length,
          acknowledged: employers.filter((emp) => emp.acknowledgedAt).length,
          events: history.total,
        },
        history: history.rows,
        // the JSON export keeps every original log as well:
        allAuditLogs: logs,
      };

      await sendPack(res, req, pack, generateStudentAuditPackPDF, `audit-pack-${student.universityId}-${generatedAt.toISOString().slice(0, 10)}`);
    } catch (err) {
      console.error("EXPORT AUDIT PACK ERROR:", err);
      res.status(500).json({ error: "Failed to export audit pack" });
    }
  }
);


// GET /audit-export/relationship/:relationshipId - Employer exports audit pack for a relationship:
router.get(
  "/relationship/:relationshipId",
  authenticate,
  authorizeRoles("EMPLOYER"),
  async (req, res) => {
    try {
      const relationshipId = Number(req.params.relationshipId);

      if (isNaN(relationshipId)) {
        return res.status(400).json({ error: "Invalid relationship ID" });
      }

      const relationship = await prisma.studentEmployer.findUnique({
        where: { id: relationshipId },
        include: { student: { include: { user: { select: { email: true } } } } },
      });

      if (!relationship) {
        return res.status(404).json({ error: "Relationship not found" });
      }

      // Verify employer owns this relationship
      if (relationship.employerId !== req.user.id) {
        return res.status(403).json({
          error: "You can only export audit packs for your own relationships",
        });
      }

      const student = relationship.student;

      // only this link's history, the student's term changes, and this employer's own checks:
      // another employer's requests or acknowledgements are never included:
      const [terms, employerProfile, employerUser, logs] = await Promise.all([
        prisma.term.findMany({ where: { studentId: student.id }, orderBy: { startDate: "asc" } }),
        prisma.employer.findUnique({ where: { userId: relationship.employerId } }),
        prisma.user.findUnique({ where: { id: relationship.employerId }, select: { email: true } }),
        prisma.auditLog.findMany({
          where: {
            OR: [
              { entityType: "StudentEmployer", entityId: relationshipId },
              { entityType: "Term", universityId: student.universityId },
              { entityType: "Student", universityId: student.universityId, performedBy: relationship.employerId },
            ],
          },
          orderBy: { createdAt: "asc" },
        }),
      ]);

      const names = await loadNames([relationship.employerId, ...logs.map((log) => log.performedBy)]);

      // this finds the latest acknowledgement log, which holds the exact words and dates agreed to:
      const ackLog = [...logs].reverse().find((log) => log.action === "EMPLOYER_ACKNOWLEDGE_DECLARATIONS");
      const resetNotice = (await findResetNotices(prisma, [relationship]))[relationship.id] || null;

      const builtTerms = buildTerms(terms, student);
      const history = buildHistory(logs, names);
      const generatedAt = new Date();

      const pack = {
        exportType: "EMPLOYER_RELATIONSHIP_AUDIT_PACK",
        reference: buildReference("E", student.universityId, generatedAt),
        generatedAt,
        disclaimer: DISCLAIMER,
        employer: {
          name: employerProfile?.fullName || employerUser?.email,
          organisation: employerProfile?.organisationName || null,
          role: employerProfile?.role ? termLabel(employerProfile.role) : null,
          workEmail: employerProfile?.workEmail || employerUser?.email,
        },
        student: {
          name: student.fullName || student.user?.email || student.universityId,
          universityName: student.universityName,
          universityId: student.universityId,
          visaType: student.visaType,
          courseEndDate: student.courseEndDate,
        },
        relationship: {
          status: relationship.status,
          statusLabel: STATUS_LABELS[relationship.status] || relationship.status,
          linkedAt: relationship.linkedAt,
          acknowledgedAt: relationship.acknowledgedAt,
          acknowledgedByName: relationship.acknowledgedBy ? nameOf(names, relationship.acknowledgedBy) : null,
          // the words saved with the acknowledgement, so the PDF shows what was really agreed:
          acknowledgementText: ackLog?.acknowledgementText || ACKNOWLEDGEMENT_TEXT,
          acknowledgedTerms: relationship.acknowledgedAt
            ? (ackLog?.metadata?.acknowledgedTerms || []).map((term) => ({ ...term, name: termLabel(term.name) }))
            : [],
          resetAt: resetNotice?.resetAt || null,
          resetReason: resetNotice?.reason || null,
        },
        currentRule: await buildCurrentRule(student),
        terms: builtTerms,
        counts: { events: history.total },
        history: history.rows,
        // the JSON export keeps every original log as well:
        allAuditLogs: logs,
      };

      await sendPack(res, req, pack, generateRelationshipAuditPackPDF, `audit-pack-${student.universityId}-${generatedAt.toISOString().slice(0, 10)}`);
    } catch (err) {
      console.error("EXPORT AUDIT PACK ERROR:", err);
      res.status(500).json({ error: "Failed to export audit pack" });
    }
  }
);

export default router;

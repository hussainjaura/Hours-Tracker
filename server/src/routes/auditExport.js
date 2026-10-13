/**
 * Audit Pack Export Routes
 * Generates PDF/ZIP exports of audit trails for Home Office compliance
 */

import express from "express";
import prisma from "../prisma.js";
import { authenticate, authorizeRoles } from "../middleware/auth.js";
import {
  getStudentAuditTrail,
  getRelationshipAuditTrail,
} from "../utils/auditLogger.js";
import {
  generateStudentAuditPackPDF,
  generateRelationshipAuditPackPDF,
} from "../utils/pdfGenerator.js";

const router = express.Router();

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
        include: {
          user: {
            select: { email: true },
          },
        },
      });

      if (!student) {
        return res.status(404).json({ error: "Student profile not found" });
      }

      const auditTrail = await getStudentAuditTrail(
        prisma,
        student.id,
        student.universityId
      );

      // Get all relationships
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

      // Build audit pack
      const auditPack = {
        // Header
        exportDate: new Date().toISOString(),
        exportType: "STUDENT_AUDIT_PACK",
        disclaimer: "This system records declarations and acknowledgements. It does not replace payroll or legal advice. This export is for compliance evidence purposes only.",
        
        // Layer 1: Identity & Context
        identity: {
          studentName: student.fullName || student.user?.email || student.universityId,
          universityId: student.universityId,
          visaType: student.visaType,
          courseEndDate: student.courseEndDate,
          maxWeeklyHours: student.maxWeeklyHours,
        },

        // Layer 2: Term Declarations
        declarations: auditTrail.declarations.map(decl => ({
          term: decl.term,
          declaredAt: decl.declaredAt,
          confirmedAt: decl.confirmedAt,
          confirmedBy: decl.confirmedBy,
          declarationText: decl.declarationLogs[0]?.declarationText || 
            "I confirm these term dates are accurate to the best of my knowledge.",
        })),

        // Layer 3: Employer Acknowledgements
        acknowledgements: auditTrail.acknowledgements.map(ack => {
          const rel = relationships.find(r => r.acknowledgedBy === ack.acknowledgedBy);
          return {
            employerId: ack.employerId,
            organisationName: ack.organisationName || 'Unknown Organisation',
            employerName: ack.employerName || 'Unknown',
            workEmail: ack.workEmail || 'N/A',
            acknowledgedAt: ack.acknowledgedAt,
            acknowledgedBy: ack.acknowledgedBy,
            acknowledgementText: ack.acknowledgementLogs[0]?.acknowledgementText ||
              "We have relied on the information provided and applied the correct working restrictions.",
          };
        }),

        // Layer 4: Compliance Rules
        complianceRules: auditTrail.complianceRules.map(rule => ({
          action: rule.action,
          createdAt: rule.createdAt,
          complianceRule: rule.complianceRule,
          metadata: rule.metadata,
        })),

        // Layer 5: Change History
        changeHistory: auditTrail.changeHistory.map(change => ({
          action: change.action,
          createdAt: change.createdAt,
          changeHistory: change.changeHistory,
          performedBy: change.performedBy,
        })),

        // All audit logs (for reference)
        allAuditLogs: auditTrail.allLogs.map(log => ({
          id: log.id,
          action: log.action,
          entityType: log.entityType,
          createdAt: log.createdAt,
          performedBy: log.performedBy,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          metadata: log.metadata,
        })),
      };

      // Check if PDF format is requested
      const format = req.query.format || 'json';
      
      if (format === 'pdf') {
        // Generate PDF
        const pdfBuffer = await generateStudentAuditPackPDF(auditPack);
        
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="audit-pack-${student.universityId}-${Date.now()}.pdf"`
        );
        res.send(pdfBuffer);
      } else {
        // Return JSON (default)
        res.setHeader("Content-Type", "application/json");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="audit-pack-${student.universityId}-${Date.now()}.json"`
        );
        res.json(auditPack);
      }
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
        return res.status(404).json({ error: "Relationship not found" });
      }

      // Verify employer owns this relationship
      if (relationship.employerId !== req.user.id) {
        return res.status(403).json({
          error: "You can only export audit packs for your own relationships",
        });
      }

      const auditTrail = await getRelationshipAuditTrail(prisma, relationshipId);

      // Get student's terms
      const terms = await prisma.term.findMany({
        where: { studentId: relationship.studentId },
        orderBy: { startDate: "asc" },
      });

      // Build audit pack:
      const auditPack = {
        // Header
        exportDate: new Date().toISOString(),
        exportType: "EMPLOYER_RELATIONSHIP_AUDIT_PACK",
        disclaimer: "This system records declarations and acknowledgements. It does not replace payroll or legal advice. This export is for compliance evidence purposes only.",
        
        // Layer 1: Identity & Context
        identity: {
          studentName: relationship.student.fullName || relationship.student.user?.email || relationship.student.universityId,
          studentUniversityId: relationship.student.universityId,
          employerId: relationship.employerId,
          visaType: relationship.student.visaType,
          courseEndDate: relationship.student.courseEndDate,
        },

        // Layer 2: Student Declarations (terms)
        studentDeclarations: terms.map(term => ({
          term: {
            name: term.name,
            academicYear: term.academicYear,
            startDate: term.startDate,
            endDate: term.endDate,
          },
          declaredAt: term.createdAt,
          confirmedAt: term.confirmedAt,
          confirmedBy: term.confirmedBy,
        })),

        // Layer 3: Employer Acknowledgement
        employerAcknowledgement: relationship.acknowledgedAt ? {
          acknowledgedAt: relationship.acknowledgedAt,
          acknowledgedBy: relationship.acknowledgedBy,
          acknowledgementText: auditTrail.auditLogs
            .find(log => log.action === "ACKNOWLEDGE_STUDENT_DECLARATIONS")
            ?.acknowledgementText ||
            "We have relied on the information provided and applied the correct working restrictions.",
        } : null,

        // Layer 4: Compliance Rules
        complianceRules: auditTrail.auditLogs
          .filter(log => 
            log.action === "SYSTEM_GENERATE_COMPLIANCE_RULE" ||
            log.action === "CHECK_ELIGIBILITY_COMPLIANCE"
          )
          .map(log => ({
            action: log.action,
            createdAt: log.createdAt,
            complianceRule: log.complianceRule,
            metadata: log.metadata,
          })),

        // Layer 5: Change History
        changeHistory: auditTrail.auditLogs
          .filter(log => log.changeHistory !== null)
          .map(log => ({
            action: log.action,
            createdAt: log.createdAt,
            changeHistory: log.changeHistory,
            performedBy: log.performedBy,
          })),

        // Relationship details
        relationship: auditTrail.relationship,

        // All audit logs
        allAuditLogs: auditTrail.auditLogs.map(log => ({
          id: log.id,
          action: log.action,
          entityType: log.entityType,
          createdAt: log.createdAt,
          performedBy: log.performedBy,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          metadata: log.metadata,
        })),
      };

      // Check if PDF format is requested
      const format = req.query.format || 'json';
      
      if (format === 'pdf') {
        // Generate PDF:
        const pdfBuffer = await generateRelationshipAuditPackPDF(auditPack);
        
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="audit-pack-relationship-${relationshipId}-${Date.now()}.pdf"`
        );
        res.send(pdfBuffer);
      } else {
        // Return JSON (default)
        res.setHeader("Content-Type", "application/json");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="audit-pack-relationship-${relationshipId}-${Date.now()}.json"`
        );
        res.json(auditPack);
      }
    } catch (err) {
      console.error("EXPORT AUDIT PACK ERROR:", err);
      res.status(500).json({ error: "Failed to export audit pack" });
    }
  }
);

export default router;

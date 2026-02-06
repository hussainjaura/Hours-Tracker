import express from "express";
import prisma from "../prisma.js";
import { authenticate, authorizeRoles } from "../middleware/auth.js";
import {
  getStudentAuditTrail,
  getRelationshipAuditTrail,
} from "../utils/auditLogger.js";

const router = express.Router();

/**
 * ============================================
 * ADMIN ROUTES - View All Audit Logs
 * ============================================
 */

/**
 * GET /audit/audit-logs - Admin views all audit logs
 */
router.get(
  "/audit-logs",
  authenticate,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    try {
      const { limit = 100, offset = 0, action, entityType } = req.query;

      const where = {};
      if (action) where.action = action;
      if (entityType) where.entityType = entityType;

      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: parseInt(limit),
        skip: parseInt(offset),
      });

      const total = await prisma.auditLog.count({ where });

      res.json({
        logs,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    } catch (err) {
      console.error("AUDIT LOG ERROR:", err);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  }
);

/**
 * GET /audit/audit-logs/student/:universityId - Admin views audit logs for a specific student
 */
router.get(
  "/audit-logs/student/:universityId",
  authenticate,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    try {
      const { universityId } = req.params;

      const student = await prisma.student.findUnique({
        where: { universityId },
      });

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      const logs = await prisma.auditLog.findMany({
        where: { universityId },
        orderBy: { createdAt: "desc" },
      });

      res.json(logs);
    } catch (err) {
      console.error("AUDIT LOG ERROR:", err);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  }
);

/**
 * ============================================
 * STUDENT ROUTES - View Own Audit Trail
 * ============================================
 */

/**
 * GET /audit/my-audit-trail - Student views their own comprehensive audit trail
 */
router.get(
  "/my-audit-trail",
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

      const auditTrail = await getStudentAuditTrail(
        prisma,
        student.id,
        student.universityId
      );

      res.json(auditTrail);
    } catch (err) {
      console.error("GET AUDIT TRAIL ERROR:", err);
      res.status(500).json({ error: "Failed to fetch audit trail" });
    }
  }
);

/**
 * GET /audit/my-audit-logs - Student views their own audit logs
 */
router.get(
  "/my-audit-logs",
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

      const logs = await prisma.auditLog.findMany({
        where: { universityId: student.universityId },
        orderBy: { createdAt: "desc" },
      });

      res.json(logs);
    } catch (err) {
      console.error("GET AUDIT LOGS ERROR:", err);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  }
);

/**
 * ============================================
 * EMPLOYER ROUTES - View Relationship Audit Trail
 * ============================================
 */

/**
 * GET /audit/relationship/:relationshipId - Employer views audit trail for a specific student relationship
 */
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
      });

      if (!relationship) {
        return res.status(404).json({ error: "Relationship not found" });
      }

      // Verify employer owns this relationship
      if (relationship.employerId !== req.user.id) {
        return res.status(403).json({
          error: "You can only view audit trails for your own relationships",
        });
      }

      const auditTrail = await getRelationshipAuditTrail(
        prisma,
        relationshipId
      );

      res.json(auditTrail);
    } catch (err) {
      console.error("GET RELATIONSHIP AUDIT TRAIL ERROR:", err);
      res.status(500).json({ error: "Failed to fetch audit trail" });
    }
  }
);

/**
 * GET /audit/my-relationships - Employer views audit trails for all their relationships
 */
router.get(
  "/my-relationships",
  authenticate,
  authorizeRoles("EMPLOYER"),
  async (req, res) => {
    try {
      const relationships = await prisma.studentEmployer.findMany({
        where: { employerId: req.user.id },
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

      const auditTrails = await Promise.all(
        relationships.map(async (rel) => {
          try {
            const trail = await getRelationshipAuditTrail(prisma, rel.id);
            return {
              relationshipId: rel.id,
              studentUniversityId: rel.student.universityId,
              status: rel.status,
              acknowledgedAt: rel.acknowledgedAt,
              auditTrail: trail,
            };
          } catch (err) {
            console.error(`Error fetching trail for relationship ${rel.id}:`, err);
            return {
              relationshipId: rel.id,
              studentUniversityId: rel.student.universityId,
              error: "Failed to load audit trail",
            };
          }
        })
      );

      res.json(auditTrails);
    } catch (err) {
      console.error("GET RELATIONSHIPS AUDIT TRAIL ERROR:", err);
      res.status(500).json({ error: "Failed to fetch audit trails" });
    }
  }
);

export default router;
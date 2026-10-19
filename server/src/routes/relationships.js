import express from "express";
import prisma from "../prisma.js";
import { authenticate, authorizeRoles } from "../middleware/auth.js";
import { logEmployerAcknowledgement } from "../utils/auditLogger.js";

const router = express.Router();

// EMPLOYER ROUTES - Request Student Access:


// POST /relationships/request - Employer requests access to a student:
router.post(
  "/request",
  authenticate,
  authorizeRoles("EMPLOYER"),
  async (req, res) => {
    try {
      const { studentUniversityId } = req.body;

      if (!studentUniversityId) {
        return res.status(400).json({
          error: "studentUniversityId is required",
        });
      }

      // Find student
      const student = await prisma.student.findUnique({
        where: { universityId: studentUniversityId },
      });

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      // Check if relationship already exists
      const existing = await prisma.studentEmployer.findUnique({
        where: {
          studentId_employerId: {
            studentId: student.id,
            employerId: req.user.id,
          },
        },
      });

      // this only blocks a new request while the old one is still pending or active:
      // a removed employer (inactive) is allowed to ask again:
      if (existing && existing.status !== "INACTIVE") {
        return res.status(409).json({
          success: false,
          error: {
            message: `Relationship already exists with status: ${existing.status}`,
            code: "RELATIONSHIP_EXISTS",
            relationship: existing,
          },
        });
      }

      let relationship;
      if (existing) {
        // this reopens the old removed link as a fresh request so its history stays in one place:
        // the old acknowledgement is cleared because the student has to accept again:
        relationship = await prisma.studentEmployer.update({
          where: { id: existing.id },
          data: {
            status: "PENDING",
            linkedAt: new Date(),
            acknowledgedAt: null,
            acknowledgedBy: null,
          },
        });
      } else {
        // Create relationship request
        relationship = await prisma.studentEmployer.create({
          data: {
            studentId: student.id,
            employerId: req.user.id,
            status: "PENDING",
          },
        });
      }

      // AUDIT LOG
      await prisma.auditLog.create({
        data: {
          action: "REQUEST_STUDENT_ACCESS",
          entityType: "StudentEmployer",
          entityId: relationship.id,
          performedBy: req.user.id,
          universityId: student.universityId,
          metadata: {
            studentUniversityId,
            employerId: req.user.id,
            status: "PENDING",
          },
        },
      });

      res.status(201).json({
        relationship,
        message: "Access request sent. Awaiting student approval.",
      });
    } catch (error) {
      console.error("REQUEST RELATIONSHIP ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET /relationships/my-students - Employer views all their student relationships:
router.get(
  "/my-students",
  authenticate,
  authorizeRoles("EMPLOYER"),
  async (req, res) => {
    try {
      const { status } = req.query;

      const where = {
        employerId: req.user.id,
      };

      if (status) {
        where.status = status;
      }

      const relationships = await prisma.studentEmployer.findMany({
        where,
        include: {
          student: {
            include: {
              user: {
                select: {
                  email: true,
                },
              },
              terms: {
                orderBy: { startDate: "asc" },
              },
            },
          },
        },
        orderBy: { linkedAt: "desc" },
      });

      // Only students who accepted this employer share their details.
      // For pending requests the employer just sees the ID they asked for.
      const visible = relationships.map((rel) =>
        rel.status === "ACTIVE"
          ? rel
          : { ...rel, student: { universityId: rel.student.universityId } }
      );

      res.json(visible);
    } catch (error) {
      console.error("GET MY STUDENTS ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// DELETE /relationships/:relationshipId - Employer removes relationship:
router.delete(
  "/:relationshipId",
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
          student: true,
        },
      });

      if (!relationship) {
        return res.status(404).json({ error: "Relationship not found" });
      }

      if (relationship.employerId !== req.user.id) {
        return res.status(403).json({
          error: "You can only remove your own relationships",
        });
      }

      await prisma.studentEmployer.delete({
        where: { id: relationshipId },
      });

      // AUDIT LOG
      await prisma.auditLog.create({
        data: {
          action: "REMOVE_STUDENT_RELATIONSHIP",
          entityType: "StudentEmployer",
          entityId: relationship.id,
          performedBy: req.user.id,
          universityId: relationship.student.universityId,
          metadata: {
            studentId: relationship.studentId,
            previousStatus: relationship.status,
          },
        },
      });

      res.json({ message: "Relationship removed successfully" });
    } catch (error) {
      console.error("REMOVE RELATIONSHIP ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// STUDENT ROUTES - Manage Employer Access:


// GET /relationships/requests - Student views pending access requests
router.get(
  "/requests",
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

      const relationships = await prisma.studentEmployer.findMany({
        where: {
          studentId: student.id,
          status: "PENDING",
        },
        include: {
          student: {
            select: {
              universityId: true,
            },
          },
        },
        orderBy: { linkedAt: "desc" },
      });

      // Fetch employer profiles for all unique employer IDs
      const employerIds = [...new Set(relationships.map(req => req.employerId))];
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

      // Add employer profile information to requests
      const requestsWithEmployers = relationships.map(req => {
        const employerProfile = employerMap.get(req.employerId);
        return {
          ...req,
          employer: employerProfile ? {
            fullName: employerProfile.fullName,
            organisationName: employerProfile.organisationName,
            workEmail: employerProfile.workEmail || employerProfile.user?.email,
            role: employerProfile.role,
          } : null,
        };
      });

      res.json(requestsWithEmployers);
    } catch (error) {
      console.error("GET RELATIONSHIP REQUESTS ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);


// GET /relationships/my-employers - Student views all their employer relationships
router.get(
  "/my-employers",
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

      const { status } = req.query;

      const where = {
        studentId: student.id,
      };

      if (status) {
        where.status = status;
      }

      const relationships = await prisma.studentEmployer.findMany({
        where,
        orderBy: { linkedAt: "desc" },
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

      // Add employer profile information to relationships
      const relationshipsWithEmployers = relationships.map(rel => {
        const employerProfile = employerMap.get(rel.employerId);
        return {
          ...rel,
          employer: employerProfile ? {
            fullName: employerProfile.fullName,
            organisationName: employerProfile.organisationName,
            workEmail: employerProfile.workEmail || employerProfile.user?.email,
            role: employerProfile.role,
          } : null,
        };
      });

      res.json(relationshipsWithEmployers);
    } catch (error) {
      console.error("GET MY EMPLOYERS ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// PUT /relationships/:relationshipId/accept - Student accepts employer access request:
router.put(
  "/:relationshipId/accept",
  authenticate,
  authorizeRoles("STUDENT"),
  async (req, res) => {
    try {
      const relationshipId = Number(req.params.relationshipId);

      if (isNaN(relationshipId)) {
        return res.status(400).json({ error: "Invalid relationship ID" });
      }

      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
      });

      if (!student) {
        return res.status(404).json({ error: "Student profile not found" });
      }

      const relationship = await prisma.studentEmployer.findUnique({
        where: { id: relationshipId },
      });

      if (!relationship) {
        return res.status(404).json({ error: "Relationship not found" });
      }

      if (relationship.studentId !== student.id) {
        return res.status(403).json({
          error: "This relationship does not belong to you",
        });
      }

      if (relationship.status === "ACTIVE") {
        return res.status(400).json({
          error: "Relationship is already active",
        });
      }

      const updated = await prisma.studentEmployer.update({
        where: { id: relationshipId },
        data: { status: "ACTIVE" },
      });

      // AUDIT LOG
      await prisma.auditLog.create({
        data: {
          action: "ACCEPT_EMPLOYER_ACCESS",
          entityType: "StudentEmployer",
          entityId: relationship.id,
          performedBy: req.user.id,
          universityId: student.universityId,
          metadata: {
            employerId: relationship.employerId,
            previousStatus: relationship.status,
            newStatus: "ACTIVE",
          },
        },
      });

      res.json({
        relationship: updated,
        message: "Employer access granted",
      });
    } catch (error) {
      console.error("ACCEPT RELATIONSHIP ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);


// PUT /relationships/:relationshipId/reject - Student rejects employer access request:
router.put(
  "/:relationshipId/reject",
  authenticate,
  authorizeRoles("STUDENT"),
  async (req, res) => {
    try {
      const relationshipId = Number(req.params.relationshipId);

      if (isNaN(relationshipId)) {
        return res.status(400).json({ error: "Invalid relationship ID" });
      }

      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
      });

      if (!student) {
        return res.status(404).json({ error: "Student profile not found" });
      }

      const relationship = await prisma.studentEmployer.findUnique({
        where: { id: relationshipId },
      });

      if (!relationship) {
        return res.status(404).json({ error: "Relationship not found" });
      }

      if (relationship.studentId !== student.id) {
        return res.status(403).json({
          error: "This relationship does not belong to you",
        });
      }

      // Delete rejected relationship
      await prisma.studentEmployer.delete({
        where: { id: relationshipId },
      });

      // AUDIT LOG
      await prisma.auditLog.create({
        data: {
          action: "REJECT_EMPLOYER_ACCESS",
          entityType: "StudentEmployer",
          entityId: relationship.id,
          performedBy: req.user.id,
          universityId: student.universityId,
          metadata: {
            employerId: relationship.employerId,
            previousStatus: relationship.status,
          },
        },
      });

      res.json({ message: "Access request rejected" });
    } catch (error) {
      console.error("REJECT RELATIONSHIP ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// GET /relationships/rejections - Employer sees access requests that students rejected and they haven't dismissed yet.
// Rejected relationships are deleted, so the REJECT_EMPLOYER_ACCESS audit log is the record we read from.
router.get(
  "/rejections",
  authenticate,
  authorizeRoles("EMPLOYER"),
  async (req, res) => {
    try {
      const rejections = await prisma.auditLog.findMany({
        where: {
          action: "REJECT_EMPLOYER_ACCESS",
          metadata: { path: ["employerId"], equals: req.user.id },
        },
        orderBy: { createdAt: "desc" },
      });

      // Dismissals are audit logs too, pointing at the rejection log they dismissed
      const dismissals = await prisma.auditLog.findMany({
        where: {
          action: "DISMISS_REJECTION_NOTICE",
          performedBy: req.user.id,
          entityId: { in: rejections.map((r) => r.id) },
        },
        select: { entityId: true },
      });
      const dismissedIds = new Set(dismissals.map((d) => d.entityId));

      res.json(
        rejections
          .filter((r) => !dismissedIds.has(r.id))
          .map((r) => ({
            id: r.id,
            studentUniversityId: r.universityId,
            rejectedAt: r.createdAt,
          }))
      );
    } catch (error) {
      console.error("GET REJECTIONS ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// POST /relationships/rejections/:auditLogId/dismiss - Employer has seen a rejection, so stop showing it:
router.post(
  "/rejections/:auditLogId/dismiss",
  authenticate,
  authorizeRoles("EMPLOYER"),
  async (req, res) => {
    try {
      const auditLogId = Number(req.params.auditLogId);

      if (isNaN(auditLogId)) {
        return res.status(400).json({ error: "Invalid rejection ID" });
      }

      const rejection = await prisma.auditLog.findUnique({
        where: { id: auditLogId },
      });

      if (
        !rejection ||
        rejection.action !== "REJECT_EMPLOYER_ACCESS" ||
        rejection.metadata?.employerId !== req.user.id
      ) {
        return res.status(404).json({ error: "Rejection not found" });
      }

      // AUDIT LOG
      await prisma.auditLog.create({
        data: {
          action: "DISMISS_REJECTION_NOTICE",
          entityType: "AuditLog",
          entityId: rejection.id,
          performedBy: req.user.id,
          universityId: rejection.universityId,
        },
      });

      res.json({ message: "Rejection notice dismissed" });
    } catch (error) {
      console.error("DISMISS REJECTION ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);


// PUT /relationships/:relationshipId/deactivate - Student deactivates active relationship:
router.put(
  "/:relationshipId/deactivate",
  authenticate,
  authorizeRoles("STUDENT"),
  async (req, res) => {
    try {
      const relationshipId = Number(req.params.relationshipId);

      if (isNaN(relationshipId)) {
        return res.status(400).json({ error: "Invalid relationship ID" });
      }

      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
      });

      if (!student) {
        return res.status(404).json({ error: "Student profile not found" });
      }

      const relationship = await prisma.studentEmployer.findUnique({
        where: { id: relationshipId },
      });

      if (!relationship) {
        return res.status(404).json({ error: "Relationship not found" });
      }

      if (relationship.studentId !== student.id) {
        return res.status(403).json({
          error: "This relationship does not belong to you",
        });
      }

      const updated = await prisma.studentEmployer.update({
        where: { id: relationshipId },
        data: { status: "INACTIVE" },
      });

      // AUDIT LOG
      await prisma.auditLog.create({
        data: {
          action: "DEACTIVATE_EMPLOYER_ACCESS",
          entityType: "StudentEmployer",
          entityId: relationship.id,
          performedBy: req.user.id,
          universityId: student.universityId,
          metadata: {
            employerId: relationship.employerId,
            previousStatus: relationship.status,
            newStatus: "INACTIVE",
          },
        },
      });

      res.json({
        relationship: updated,
        message: "Employer access deactivated",
      });
    } catch (error) {
      console.error("DEACTIVATE RELATIONSHIP ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);


// PUT /relationships/:relationshipId/acknowledge - Employer acknowledges student declarations:
router.put(
  "/:relationshipId/acknowledge",
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
          student: true,
        },
      });

      if (!relationship) {
        return res.status(404).json({ error: "Relationship not found" });
      }

      if (relationship.employerId !== req.user.id) {
        return res.status(403).json({
          error: "You can only acknowledge your own relationships",
        });
      }

      if (relationship.status !== "ACTIVE") {
        return res.status(400).json({
          error: "You can only acknowledge active relationships",
        });
      }

      const updated = await prisma.studentEmployer.update({
        where: { id: relationshipId },
        data: {
          acknowledgedAt: new Date(),
          acknowledgedBy: req.user.id,
        },
      });

      // Get employer user for audit log
      const employer = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      // AUDIT LOG - Layer 3: Employer Acknowledgement:
      await logEmployerAcknowledgement(
        prisma,
        updated,
        relationship.student,
        employer,
        null, // Use default acknowledgement text
        req
      );

      res.json({
        relationship: updated,
        message: "Student declarations acknowledged. This has been recorded for compliance purposes.",
      });
    } catch (error) {
      console.error("ACKNOWLEDGE RELATIONSHIP ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;


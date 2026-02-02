import express from "express";
import prisma from "../prisma.js";
import { authenticate, authorizeRoles } from "../middleware/auth.js";

const router = express.Router();

/**
 * ============================================
 * EMPLOYER ROUTES - Request Student Access
 * ============================================
 */

/**
 * POST /relationships/request - Employer requests access to a student
 */
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

      if (existing) {
        return res.status(409).json({
          error: "Relationship already exists",
          relationship: existing,
        });
      }

      // Create relationship request
      const relationship = await prisma.studentEmployer.create({
        data: {
          studentId: student.id,
          employerId: req.user.id,
          status: "PENDING",
        },
      });

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

/**
 * GET /relationships/my-students - Employer views all their student relationships
 */
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
            },
          },
        },
        orderBy: { linkedAt: "desc" },
      });

      res.json(relationships);
    } catch (error) {
      console.error("GET MY STUDENTS ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * DELETE /relationships/:relationshipId - Employer removes relationship
 */
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

/**
 * ============================================
 * STUDENT ROUTES - Manage Employer Access
 * ============================================
 */

/**
 * GET /relationships/requests - Student views pending access requests
 */
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

      res.json(relationships);
    } catch (error) {
      console.error("GET RELATIONSHIP REQUESTS ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * GET /relationships/my-employers - Student views all their employer relationships
 */
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

      res.json(relationships);
    } catch (error) {
      console.error("GET MY EMPLOYERS ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * PUT /relationships/:relationshipId/accept - Student accepts employer access request
 */
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

/**
 * PUT /relationships/:relationshipId/reject - Student rejects employer access request
 */
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

/**
 * PUT /relationships/:relationshipId/deactivate - Student deactivates active relationship
 */
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

export default router;


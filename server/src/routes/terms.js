import express from "express";
import prisma from "../prisma.js";
import { authenticate, authorizeRoles } from "../middleware/auth.js";

const router = express.Router();

/**
 * CREATE TERM
 */
router.post(
  "/",
  authenticate,
  authorizeRoles("STUDENT"),
  async (req, res) => {
    try {
      const { name, startDate, endDate } = req.body;

      if (!name || !startDate || !endDate) {
        return res.status(400).json({
          error: "name, startDate, and endDate are required",
        });
      }

      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
      });

      if (!student) {
        return res.status(404).json({ error: "Student profile not found" });
      }

      const term = await prisma.term.create({
        data: {
          studentId: student.id,
          name,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        },
      });

      // 🔥 AUDIT: CREATE TERM
      await prisma.auditLog.create({
        data: {
          action: "CREATE_TERM",
          entityType: "Term",
          entityId: term.id,
          performedBy: req.user.id,
          universityId: student.universityId,
          metadata: {
            termName: term.name,
            startDate: term.startDate,
            endDate: term.endDate,
          },
        },
      });

      res.status(201).json(term);
    } catch (err) {
      console.error("CREATE TERM ERROR:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.put(
  "/:termId",
  authenticate,
  authorizeRoles("STUDENT"),
  async (req, res) => {
    const termId = Number(req.params.termId);
    const { name, startDate, endDate } = req.body;

    if (!name && !startDate && !endDate) {
      return res.status(400).json({
        error: "At least one field must be provided",
      });
    }

    try {
      // 1️⃣ Fetch term + ownership check
      const term = await prisma.term.findUnique({
        where: { id: termId },
        include: { student: true },
      });

      if (!term) {
        return res.status(404).json({ error: "Term not found" });
      }

      if (term.student.userId !== req.user.id) {
        return res.status(403).json({
          error: "You can only update your own terms",
        });
      }

      // 2️⃣ Store old values for audit
      const oldData = {
        name: term.name,
        startDate: term.startDate,
        endDate: term.endDate,
      };

      // 3️⃣ Update term
      const updatedTerm = await prisma.term.update({
        where: { id: termId },
        data: {
          ...(name && { name }),
          ...(startDate && { startDate: new Date(startDate) }),
          ...(endDate && { endDate: new Date(endDate) }),
        },
      });

      // 4️⃣ CREATE AUDIT LOG 🔥
      await prisma.auditLog.create({
        data: {
          action: "UPDATE_TERM",
          entityType: "Term",
          entityId: term.id,
          performedBy: req.user.id,
          universityId: term.student.universityId,
          metadata: {
            before: oldData,
            after: {
              name: updatedTerm.name,
              startDate: updatedTerm.startDate,
              endDate: updatedTerm.endDate,
            },
          },
        },
      });

      res.json({
        message: "Term updated successfully",
        term: updatedTerm,
      });
    } catch (err) {
      console.error("UPDATE TERM ERROR:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);



router.get(
  "/me",
  authenticate,
  authorizeRoles("STUDENT"),
  async (req, res) => {
    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
      include: { terms: true },
    });

    if (!student) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    res.json(student.terms);
  }
);

// to delete a single term succesfully!
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("STUDENT"),
  async (req, res) => {
    const termId = Number(req.params.id);

    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
    });

    if (!student) {
      return res.status(404).json({
        error: "Student profile not found",
      });
    }

    // make sure term belongs to this student
    const term = await prisma.term.findFirst({
      where: {
        id: termId,
        studentId: student.id,
      },
    });

    if (!term) {
      return res.status(404).json({
        error: "Term not found or not yours",
      });
    }

    await prisma.term.delete({
      where: { id: termId },
    });

    res.json({ message: "Term deleted successfully" });
  }
);


/**
 * DELETE ALL TERMS for logged-in student
 */
router.delete(
  "/me",
  authenticate,
  authorizeRoles("STUDENT"),
  async (req, res) => {
    try {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
      });

      if (!student) {
        return res.status(404).json({
          error: "Student profile not found",
        });
      }

      await prisma.term.deleteMany({
        where: {
          studentId: student.id,
        },
      });

      res.json({
        message: "All terms deleted successfully",
      });
    } catch (err) {
      console.error("DELETE ALL TERMS ERROR:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * ============================================
 * TERM TEMPLATE ROUTES (STUDENT)
 * ============================================
 */

/**
 * GET templates for student's university
 * GET /terms/templates/me
 */
router.get(
  "/templates/me",
  authenticate,
  authorizeRoles("STUDENT"),
  async (req, res) => {
    try {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
      });

      if (!student) {
        return res.status(404).json({
          error: "Student profile not found",
        });
      }

      // Find university by code (stored in student.universityId)
      const university = await prisma.university.findUnique({
        where: { code: student.universityId },
        include: {
          templates: {
            orderBy: { startDate: "asc" },
          },
        },
      });

      if (!university) {
        return res.status(404).json({
          error: "University not found for your profile",
        });
      }

      res.json(university.templates);
    } catch (err) {
      console.error("GET TEMPLATES ERROR:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * CREATE term from template (with optional date edits)
 * POST /terms/from-template
 */
router.post(
  "/from-template",
  authenticate,
  authorizeRoles("STUDENT"),
  async (req, res) => {
    try {
      const { templateId, startDate, endDate } = req.body;

      if (!templateId) {
        return res.status(400).json({
          error: "templateId is required",
        });
      }

      // 1️⃣ Get student
      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
      });

      if (!student) {
        return res.status(404).json({
          error: "Student profile not found",
        });
      }

      // 2️⃣ Get template and verify it belongs to student's university
      const template = await prisma.termTemplate.findUnique({
        where: { id: Number(templateId) },
        include: {
          university: true,
        },
      });

      if (!template) {
        return res.status(404).json({
          error: "Term template not found",
        });
      }

      // 3️⃣ Verify template belongs to student's university
      if (template.university.code !== student.universityId) {
        return res.status(403).json({
          error: "This template does not belong to your university",
        });
      }

      // 4️⃣ Use provided dates or fall back to template dates
      const finalStartDate = startDate ? new Date(startDate) : template.startDate;
      const finalEndDate = endDate ? new Date(endDate) : template.endDate;

      // 5️⃣ Create term from template
      const term = await prisma.term.create({
        data: {
          studentId: student.id,
          name: template.name,
          startDate: finalStartDate,
          endDate: finalEndDate,
        },
      });

      // 6️⃣ AUDIT: CREATE TERM FROM TEMPLATE
      await prisma.auditLog.create({
        data: {
          action: "CREATE_TERM_FROM_TEMPLATE",
          entityType: "Term",
          entityId: term.id,
          performedBy: req.user.id,
          universityId: student.universityId,
          metadata: {
            templateId: template.id,
            templateName: template.name,
            termName: term.name,
            startDate: term.startDate,
            endDate: term.endDate,
            datesEdited: startDate || endDate ? true : false,
          },
        },
      });

      res.status(201).json({
        term,
        message: "Term created from template successfully",
      });
    } catch (err) {
      console.error("CREATE TERM FROM TEMPLATE ERROR:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
import express from "express";
import prisma from "../prisma.js";
import { authenticate, authorizeRoles } from "../middleware/auth.js";
import { validate, validateDateRangeFields, validateDate, validateDateRange } from "../middleware/validation.js";

const router = express.Router();

/**
 * CREATE TERM
 */
router.post(
  "/",
  authenticate,
  authorizeRoles("STUDENT"),
  validate([
    { field: 'name', validator: 'required' },
    { field: 'startDate', validator: 'date' },
    { field: 'endDate', validator: 'date' }
  ]),
  validateDateRangeFields('startDate', 'endDate'),
  async (req, res) => {
    try {
      const { name, startDate, endDate } = req.body;

      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
      });

      if (!student) {
        return res.status(404).json({ error: "Student profile not found" });
      }

      // Check for duplicate term in the same year
      const startYear = new Date(startDate).getFullYear();
      const endYear = new Date(endDate).getFullYear();
      
      // Get all existing terms for this student
      const existingTerms = await prisma.term.findMany({
        where: {
          studentId: student.id,
        },
      });

      // Check if any existing term overlaps with the same year (same term name)
      const duplicateTerm = existingTerms.find(term => {
        if (term.name.toUpperCase() !== name.toUpperCase()) return false;
        const termStartYear = new Date(term.startDate).getFullYear();
        const termEndYear = new Date(term.endDate).getFullYear();
        // Check if years overlap
        return termStartYear === startYear || termStartYear === endYear || 
               termEndYear === startYear || termEndYear === endYear;
      });

      if (duplicateTerm) {
        const duplicateYear = new Date(duplicateTerm.startDate).getFullYear();
        return res.status(409).json({
          success: false,
          error: {
            message: `You already have a ${name} term in ${duplicateYear}. Each term (Autumn, Spring, Summer) can only be created once per year.`,
            code: "DUPLICATE_TERM",
            existingTerm: duplicateTerm,
          },
        });
      }

      // Check for date range overlaps with ANY existing term
      const newStart = new Date(startDate);
      const newEnd = new Date(endDate);
      
      const overlappingTerm = existingTerms.find(term => {
        const termStart = new Date(term.startDate);
        const termEnd = new Date(term.endDate);
        
        // Check if date ranges overlap
        // Two ranges overlap if: newStart <= termEnd && newEnd >= termStart
        return newStart <= termEnd && newEnd >= termStart;
      });

      if (overlappingTerm) {
        const termStartStr = new Date(overlappingTerm.startDate).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
        const termEndStr = new Date(overlappingTerm.endDate).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
        
        return res.status(409).json({
          success: false,
          error: {
            message: `This term overlaps with your existing ${overlappingTerm.name} term (${termStartStr} - ${termEndStr}). Terms cannot have overlapping dates.`,
            code: "OVERLAPPING_TERM",
            existingTerm: overlappingTerm,
          },
        });
      }

      const term = await prisma.term.create({
        data: {
          studentId: student.id,
          name: name.toUpperCase(),
          startDate,
          endDate,
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
      // Validate dates if provided
      if (startDate || endDate) {
        const startValidation = startDate ? validateDate(startDate, 'startDate') : { valid: true };
        const endValidation = endDate ? validateDate(endDate, 'endDate') : { valid: true };
        
        if (!startValidation.valid) {
          return res.status(400).json({ error: startValidation.error });
        }
        if (!endValidation.valid) {
          return res.status(400).json({ error: endValidation.error });
        }
        
        // If both dates provided, validate range
        if (startDate && endDate) {
          const rangeValidation = validateDateRange(startDate, endDate);
          if (!rangeValidation.valid) {
            return res.status(400).json({ error: rangeValidation.error });
          }
          req.body.startDate = rangeValidation.startDate;
          req.body.endDate = rangeValidation.endDate;
        } else if (startDate) {
          req.body.startDate = startValidation.date;
        } else if (endDate) {
          req.body.endDate = endValidation.date;
        }
      }

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

      // 2.5️⃣ Check for overlapping terms if dates are being updated
      if (req.body.startDate || req.body.endDate) {
        const updatedStart = req.body.startDate ? new Date(req.body.startDate) : term.startDate;
        const updatedEnd = req.body.endDate ? new Date(req.body.endDate) : term.endDate;

        // Get all other terms (excluding the one being updated)
        const otherTerms = await prisma.term.findMany({
          where: {
            studentId: student.id,
            id: { not: termId },
          },
        });

        // Check for date range overlaps
        const overlappingTerm = otherTerms.find(otherTerm => {
          const otherStart = new Date(otherTerm.startDate);
          const otherEnd = new Date(otherTerm.endDate);
          // Two ranges overlap if: updatedStart <= otherEnd && updatedEnd >= otherStart
          return updatedStart <= otherEnd && updatedEnd >= otherStart;
        });

        if (overlappingTerm) {
          const termStartStr = new Date(overlappingTerm.startDate).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });
          const termEndStr = new Date(overlappingTerm.endDate).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });
          
          return res.status(409).json({
            success: false,
            error: {
              message: `This update would cause overlap with your existing ${overlappingTerm.name} term (${termStartStr} - ${termEndStr}). Terms cannot have overlapping dates.`,
              code: "OVERLAPPING_TERM",
              existingTerm: overlappingTerm,
            },
          });
        }
      }

      // 3️⃣ Update term
      const updatedTerm = await prisma.term.update({
        where: { id: termId },
        data: {
          ...(name && { name }),
          ...(req.body.startDate && { startDate: req.body.startDate }),
          ...(req.body.endDate && { endDate: req.body.endDate }),
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

      // 4.5️⃣ Check for duplicate term in the same year
      const startYear = new Date(finalStartDate).getFullYear();
      const endYear = new Date(finalEndDate).getFullYear();
      
      // Get all existing terms for this student
      const existingTerms = await prisma.term.findMany({
        where: {
          studentId: student.id,
        },
      });

      // Check if any existing term with same name overlaps with the same year
      const duplicateTerm = existingTerms.find(term => {
        if (term.name.toUpperCase() !== template.name.toUpperCase()) return false;
        const termStartYear = new Date(term.startDate).getFullYear();
        const termEndYear = new Date(term.endDate).getFullYear();
        return termStartYear === startYear || termStartYear === endYear || 
               termEndYear === startYear || termEndYear === endYear;
      });

      if (duplicateTerm) {
        const duplicateYear = new Date(duplicateTerm.startDate).getFullYear();
        return res.status(409).json({
          success: false,
          error: {
            message: `You already have a ${template.name} term in ${duplicateYear}. Each term (Autumn, Spring, Summer) can only be created once per year.`,
            code: "DUPLICATE_TERM",
            existingTerm: duplicateTerm,
          },
        });
      }

      // Check for date range overlaps with ANY existing term
      const newStart = new Date(finalStartDate);
      const newEnd = new Date(finalEndDate);
      
      const overlappingTerm = existingTerms.find(term => {
        const termStart = new Date(term.startDate);
        const termEnd = new Date(term.endDate);
        
        // Check if date ranges overlap
        // Two ranges overlap if: newStart <= termEnd && newEnd >= termStart
        return newStart <= termEnd && newEnd >= termStart;
      });

      if (overlappingTerm) {
        const termStartStr = new Date(overlappingTerm.startDate).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
        const termEndStr = new Date(overlappingTerm.endDate).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
        
        return res.status(409).json({
          success: false,
          error: {
            message: `This term overlaps with your existing ${overlappingTerm.name} term (${termStartStr} - ${termEndStr}). Terms cannot have overlapping dates.`,
            code: "OVERLAPPING_TERM",
            existingTerm: overlappingTerm,
          },
        });
      }

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
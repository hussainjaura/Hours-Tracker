import express from "express";
import prisma from "../prisma.js";
import { authenticate, authorizeRoles } from "../middleware/auth.js";
import { validate, validateDateRangeFields, validateDate, validateDateRange, validateAcademicYear, validateTermDatesAgainstAcademicYear } from "../middleware/validation.js";
import {
  logTermDeclaration,
  logChangeHistory,
  createComprehensiveAuditLog,
} from "../utils/auditLogger.js";
import { generateTermLetterPDF } from "../utils/pdfGenerator.js";

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
    { field: 'academicYear', validator: 'required' },
    { field: 'startDate', validator: 'date' },
    { field: 'endDate', validator: 'date' }
  ]),
  validateDateRangeFields('startDate', 'endDate'),
  async (req, res) => {
    try {
      const { name, startDate, endDate, academicYear, courseLevel } = req.body;

      // Validate academic year (required)
      if (!academicYear) {
        return res.status(400).json({
          success: false,
          error: {
            message: "Academic year is required. Please provide in format YYYY/YY or YY/YY (e.g., '2025/26' or '25/26')",
            code: "ACADEMIC_YEAR_REQUIRED",
          },
        });
      }

      const academicYearValidation = validateAcademicYear(academicYear);
      if (!academicYearValidation.valid) {
        return res.status(400).json({
          success: false,
          error: {
            message: academicYearValidation.error,
            code: "INVALID_ACADEMIC_YEAR",
          },
        });
      }
      req.body.academicYear = academicYearValidation.academicYear;

      // Validate that term dates fall within the academic year
      const dateValidation = validateTermDatesAgainstAcademicYear(
        req.body.academicYear,
        startDate,
        endDate
      );
      if (!dateValidation.valid) {
        return res.status(400).json({
          success: false,
          error: {
            message: dateValidation.error,
            code: "TERM_DATES_OUTSIDE_ACADEMIC_YEAR",
          },
        });
      }

      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
      });

      if (!student) {
        return res.status(404).json({ error: "Student profile not found" });
      }

      // Get all existing terms for this student
      const existingTerms = await prisma.term.findMany({
        where: {
          studentId: student.id,
        },
      });

      // Check for duplicate term in the same academic year (same term name)
      const duplicateTerm = existingTerms.find(term => {
        if (term.name.toUpperCase() !== name.toUpperCase()) return false;
        if (!term.academicYear) return false; // Skip terms without academic year
        return term.academicYear === req.body.academicYear;
      });

      if (duplicateTerm) {
        return res.status(409).json({
          success: false,
          error: {
            message: `You already have a ${name} term in academic year ${req.body.academicYear}. Each term (Autumn, Spring, Summer) can only be created once per academic year.`,
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
          courseLevel: courseLevel || 'DEGREE_OR_ABOVE', // Default to 20 hours for most degrees
          name: name.toUpperCase(),
          academicYear: req.body.academicYear,
          startDate,
          endDate,
        },
      });

      // Get user for audit log
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      // AUDIT: Layer 2 - Term Declaration
      await logTermDeclaration(prisma, term, student, user, null, req);

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
    const { name, startDate, endDate, academicYear, courseLevel } = req.body;

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

      // 2️⃣ Validate academic year if provided (must be valid if updating)
      let validatedAcademicYear = term.academicYear; // Keep existing if not updating
      if (academicYear !== undefined) {
        if (academicYear === null || academicYear === '') {
          return res.status(400).json({
            success: false,
            error: {
              message: "Academic year is required. Please provide in format YYYY/YY or YY/YY (e.g., '2025/26' or '25/26')",
              code: "ACADEMIC_YEAR_REQUIRED",
            },
          });
        }
        const academicYearValidation = validateAcademicYear(academicYear);
        if (!academicYearValidation.valid) {
          return res.status(400).json({
            success: false,
            error: {
              message: academicYearValidation.error,
              code: "INVALID_ACADEMIC_YEAR",
            },
          });
        }
        validatedAcademicYear = academicYearValidation.academicYear;
      }

      // 2.4️⃣ Validate that term dates fall within the academic year (if dates or academic year are being updated)
      if ((startDate || endDate || academicYear !== undefined) && validatedAcademicYear) {
        const finalStartDate = startDate ? new Date(startDate) : term.startDate;
        const finalEndDate = endDate ? new Date(endDate) : term.endDate;
        
        const dateValidation = validateTermDatesAgainstAcademicYear(
          validatedAcademicYear,
          finalStartDate,
          finalEndDate
        );
        if (!dateValidation.valid) {
          return res.status(400).json({
            success: false,
            error: {
              message: dateValidation.error,
              code: "TERM_DATES_OUTSIDE_ACADEMIC_YEAR",
            },
          });
        }
      }

      // 2.5️⃣ Check for duplicate term in same academic year if academic year is being updated
      if (academicYear !== undefined && validatedAcademicYear) {
        const otherTerms = await prisma.term.findMany({
          where: {
            studentId: term.studentId,
            id: { not: termId },
          },
        });

        const duplicateTerm = otherTerms.find(otherTerm => {
          if (otherTerm.name.toUpperCase() !== (name || term.name).toUpperCase()) return false;
          if (!otherTerm.academicYear) return false;
          return otherTerm.academicYear === validatedAcademicYear;
        });

        if (duplicateTerm) {
          return res.status(409).json({
            success: false,
            error: {
              message: `You already have a ${name || term.name} term in academic year ${validatedAcademicYear}. Each term (Autumn, Spring, Summer) can only be created once per academic year.`,
              code: "DUPLICATE_TERM",
              existingTerm: duplicateTerm,
            },
          });
        }
      }

      // 2.6️⃣ Store old values for audit
      const oldData = {
        name: term.name,
        academicYear: term.academicYear,
        courseLevel: term.courseLevel,
        startDate: term.startDate,
        endDate: term.endDate,
      };

      // 2.7️⃣ Check for overlapping terms if dates are being updated
      if (req.body.startDate || req.body.endDate) {
        const updatedStart = req.body.startDate ? new Date(req.body.startDate) : term.startDate;
        const updatedEnd = req.body.endDate ? new Date(req.body.endDate) : term.endDate;

        // Get all other terms (excluding the one being updated)
        const otherTerms = await prisma.term.findMany({
          where: {
            studentId: term.studentId,
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
      // If dates are being updated, clear confirmation (dates changed, needs re-confirmation)
      const updateData = {
        ...(name && { name: name.toUpperCase() }),
        ...(academicYear !== undefined && { academicYear: validatedAcademicYear }),
        ...(courseLevel !== undefined && { courseLevel: courseLevel || null }),
        ...(req.body.startDate && { startDate: req.body.startDate }),
        ...(req.body.endDate && { endDate: req.body.endDate }),
      };
      
      // Clear confirmation if dates are being updated
      if (req.body.startDate || req.body.endDate) {
        updateData.confirmedAt = null;
        updateData.confirmedBy = null;
      }
      
      const updatedTerm = await prisma.term.update({
        where: { id: termId },
        data: updateData,
      });

      // 4️⃣ CREATE AUDIT LOG - Layer 5: Change History 🔥
      const newData = {
        name: updatedTerm.name,
        academicYear: updatedTerm.academicYear,
        courseLevel: updatedTerm.courseLevel,
        startDate: updatedTerm.startDate,
        endDate: updatedTerm.endDate,
      };

      await logChangeHistory(
        prisma,
        "UPDATE_TERM",
        "Term",
        term.id,
        req.user.id,
        term.student.universityId,
        oldData,
        newData,
        "Student updated term dates",
        req
      );

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

/**
 * PUT /terms/:termId/confirm - Student confirms term dates (compliance requirement)
 */
router.put(
  "/:termId/confirm",
  authenticate,
  authorizeRoles("STUDENT"),
  async (req, res) => {
    try {
      const termId = Number(req.params.termId);

      if (isNaN(termId)) {
        return res.status(400).json({ error: "Invalid term ID" });
      }

      const term = await prisma.term.findUnique({
        where: { id: termId },
        include: { student: true },
      });

      if (!term) {
        return res.status(404).json({ error: "Term not found" });
      }

      if (term.student.userId !== req.user.id) {
        return res.status(403).json({
          error: "You can only confirm your own terms",
        });
      }

      const updated = await prisma.term.update({
        where: { id: termId },
        data: {
          confirmedAt: new Date(),
          confirmedBy: req.user.id,
        },
      });

      // Get user for audit log
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
      });

      // AUDIT LOG - Layer 2: Declaration Confirmation
      const declarationText = "I confirm these term dates are accurate to the best of my knowledge.";
      await logTermDeclaration(prisma, updated, term.student, user, declarationText, req);

      res.json({
        term: updated,
        message: "Term dates confirmed. This confirmation has been recorded for compliance purposes.",
      });
    } catch (error) {
      console.error("CONFIRM TERM ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
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
      const { templateId, startDate, endDate, academicYear } = req.body;

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

      // Validate academic year (required)
      const academicYearValidation = validateAcademicYear(academicYear);
      if (!academicYearValidation.valid) {
        return res.status(400).json({
          success: false,
          error: {
            message: academicYearValidation.error,
            code: "INVALID_ACADEMIC_YEAR",
          },
        });
      }
      const validatedAcademicYear = academicYearValidation.academicYear;

      // 4.4️⃣ Validate that term dates fall within the academic year
      const dateValidation = validateTermDatesAgainstAcademicYear(
        validatedAcademicYear,
        finalStartDate,
        finalEndDate
      );
      if (!dateValidation.valid) {
        return res.status(400).json({
          success: false,
          error: {
            message: dateValidation.error,
            code: "TERM_DATES_OUTSIDE_ACADEMIC_YEAR",
          },
        });
      }

      // 4.5️⃣ Check for duplicate term in the same academic year
      // Get all existing terms for this student
      const existingTerms = await prisma.term.findMany({
        where: {
          studentId: student.id,
        },
      });

      // Check for duplicate term in the same academic year (same term name)
      const duplicateTerm = existingTerms.find(term => {
        if (term.name.toUpperCase() !== template.name.toUpperCase()) return false;
        if (!term.academicYear) return false; // Skip terms without academic year
        return term.academicYear === validatedAcademicYear;
      });

      if (duplicateTerm) {
        return res.status(409).json({
          success: false,
          error: {
            message: `You already have a ${template.name} term in academic year ${validatedAcademicYear}. Each term (Autumn, Spring, Summer) can only be created once per academic year.`,
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
          academicYear: validatedAcademicYear,
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

/**
 * GET /terms/letter/pdf - Download term letter PDF
 */
router.get(
  "/letter/pdf",
  authenticate,
  authorizeRoles("STUDENT"),
  async (req, res) => {
    try {
      // Get student with user info
      const student = await prisma.student.findUnique({
        where: { userId: req.user.id },
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      });

      if (!student) {
        return res.status(404).json({ error: "Student profile not found" });
      }

      // Get all confirmed terms for this student
      const terms = await prisma.term.findMany({
        where: { 
          studentId: student.id,
          confirmedAt: { not: null } // Only include confirmed terms
        },
        orderBy: [
          { academicYear: 'desc' },
          { startDate: 'asc' },
        ],
      });

      if (terms.length === 0) {
        return res.status(400).json({ 
          error: "No confirmed terms found. Please confirm at least one term before generating the letter." 
        });
      }

      // Generate PDF
      const pdfBuffer = await generateTermLetterPDF(student, terms);

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="term-letter-${student.universityId}-${new Date().toISOString().split('T')[0]}.pdf"`
      );

      // Send PDF
      res.send(pdfBuffer);
    } catch (err) {
      console.error("GENERATE TERM LETTER PDF ERROR:", err);
      res.status(500).json({ error: "Failed to generate term letter PDF" });
    }
  }
);

/**
 * GET /terms/letter/pdf/:universityId - Download term letter PDF for a specific student (EMPLOYER)
 */
router.get(
  "/letter/pdf/:universityId",
  authenticate,
  authorizeRoles("EMPLOYER"),
  async (req, res) => {
    try {
      const { universityId } = req.params;

      // Get student by university ID
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

      // Get all confirmed terms for this student
      const terms = await prisma.term.findMany({
        where: { 
          studentId: student.id,
          confirmedAt: { not: null } // Only include confirmed terms
        },
        orderBy: [
          { academicYear: 'desc' },
          { startDate: 'asc' },
        ],
      });

      if (terms.length === 0) {
        return res.status(400).json({ 
          error: "No confirmed terms found for this student. The student has not confirmed any term dates yet." 
        });
      }

      // Generate PDF
      const pdfBuffer = await generateTermLetterPDF(student, terms);

      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="term-letter-${student.universityId}-${new Date().toISOString().split('T')[0]}.pdf"`
      );

      // Send PDF
      res.send(pdfBuffer);
    } catch (err) {
      console.error("GENERATE TERM LETTER PDF ERROR:", err);
      res.status(500).json({ error: "Failed to generate term letter PDF" });
    }
  }
);

export default router;
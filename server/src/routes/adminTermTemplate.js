import express from "express";
import prisma from "../prisma.js";
import { authenticate, authorizeRoles } from "../middleware/auth.js";

const router = express.Router();



/**
 * ============================================
 * TERM TEMPLATE CRUD OPERATIONS (ADMIN only)
 * ============================================
 */

/**
 * GET all term templates for a university
 */
router.get(
    "/universities/:universityId/templates",
    authenticate,
    authorizeRoles("ADMIN"),
    async (req, res) => {
      try {
        const universityId = Number(req.params.universityId);
  
        if (isNaN(universityId)) {
          return res.status(400).json({ error: "Invalid university ID" });
        }
  
        const university = await prisma.university.findUnique({
          where: { id: universityId },
        });
  
        if (!university) {
          return res.status(404).json({ error: "University not found" });
        }
  
        const templates = await prisma.termTemplate.findMany({
          where: { universityId },
          orderBy: { startDate: "asc" },
        });
  
        res.json(templates);
      } catch (error) {
        console.error("GET TEMPLATES ERROR:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  
  /**
   * CREATE a new term template
   */
  router.post(
    "/universities/:universityId/templates",
    authenticate,
    authorizeRoles("ADMIN"),
    async (req, res) => {
      try {
        const universityId = Number(req.params.universityId);
        const { name, startDate, endDate } = req.body;
  
        if (isNaN(universityId)) {
          return res.status(400).json({ error: "Invalid university ID" });
        }
  
        if (!name || !startDate || !endDate) {
          return res.status(400).json({
            error: "name, startDate, and endDate are required",
          });
        }
  
        // Verify university exists
        const university = await prisma.university.findUnique({
          where: { id: universityId },
        });
  
        if (!university) {
          return res.status(404).json({ error: "University not found" });
        }
  
        const template = await prisma.termTemplate.create({
          data: {
            universityId,
            name: name.toUpperCase(), // Normalize to uppercase
            startDate: new Date(startDate),
            endDate: new Date(endDate),
          },
        });
  
        // AUDIT LOG
        await prisma.auditLog.create({
          data: {
            action: "CREATE_TERM_TEMPLATE",
            entityType: "TermTemplate",
            entityId: template.id,
            performedBy: req.user.id,
            universityId: university.code, // Use university code for filtering
            metadata: {
              universityId: template.universityId,
              name: template.name,
              startDate: template.startDate,
              endDate: template.endDate,
            },
          },
        });
  
        res.status(201).json(template);
      } catch (error) {
        console.error("CREATE TEMPLATE ERROR:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  
  /**
   * UPDATE a term template
   */
  router.put(
    "/templates/:templateId",
    authenticate,
    authorizeRoles("ADMIN"),
    async (req, res) => {
      try {
        const templateId = Number(req.params.templateId);
        const { name, startDate, endDate } = req.body;
  
        if (isNaN(templateId)) {
          return res.status(400).json({ error: "Invalid template ID" });
        }
  
        // Get old values and university for audit
        const oldTemplate = await prisma.termTemplate.findUnique({
          where: { id: templateId },
          include: { university: true },
        });
  
        if (!oldTemplate) {
          return res.status(404).json({ error: "Term template not found" });
        }
  
        const updateData = {};
        if (name) updateData.name = name.toUpperCase();
        if (startDate) updateData.startDate = new Date(startDate);
        if (endDate) updateData.endDate = new Date(endDate);
  
        if (Object.keys(updateData).length === 0) {
          return res.status(400).json({
            error: "At least one field must be provided",
          });
        }
  
        const updated = await prisma.termTemplate.update({
          where: { id: templateId },
          data: updateData,
        });
  
        // AUDIT LOG
        await prisma.auditLog.create({
          data: {
            action: "UPDATE_TERM_TEMPLATE",
            entityType: "TermTemplate",
            entityId: updated.id,
            performedBy: req.user.id,
            universityId: oldTemplate.university.code,
            metadata: {
              before: {
                name: oldTemplate.name,
                startDate: oldTemplate.startDate,
                endDate: oldTemplate.endDate,
              },
              after: {
                name: updated.name,
                startDate: updated.startDate,
                endDate: updated.endDate,
              },
            },
          },
        });
  
        res.json(updated);
      } catch (error) {
        console.error("UPDATE TEMPLATE ERROR:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  
  /**
   * DELETE a term template
   */
  router.delete(
    "/templates/:templateId",
    authenticate,
    authorizeRoles("ADMIN"),
    async (req, res) => {
      try {
        const templateId = Number(req.params.templateId);
  
        if (isNaN(templateId)) {
          return res.status(400).json({ error: "Invalid template ID" });
        }
  
        // Get template data for audit before deletion
        const template = await prisma.termTemplate.findUnique({
          where: { id: templateId },
          include: { university: true },
        });
  
        if (!template) {
          return res.status(404).json({ error: "Term template not found" });
        }
  
        // AUDIT LOG (before deletion)
        await prisma.auditLog.create({
          data: {
            action: "DELETE_TERM_TEMPLATE",
            entityType: "TermTemplate",
            entityId: template.id,
            performedBy: req.user.id,
            universityId: template.university.code,
            metadata: {
              universityId: template.universityId,
              name: template.name,
              startDate: template.startDate,
              endDate: template.endDate,
            },
          },
        });
  
        await prisma.termTemplate.delete({
          where: { id: templateId },
        });
  
        res.json({ message: "Term template deleted successfully" });
      } catch (error) {
        console.error("DELETE TEMPLATE ERROR:", error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  
export default router;
  
/**
 * Audit Pack Export Routes
 * Generates PDF/ZIP exports of audit trails for Home Office compliance
 */

import express from "express";
import prisma from "../prisma.js";
import { authenticate, authorizeRoles } from "../middleware/auth.js";
import {
  generateStudentAuditPackPDF,
  generateRelationshipAuditPackPDF,
} from "../utils/pdfGenerator.js";
// the packs are built in one shared place, so the Audit Trail tabs show the same evidence as the PDFs:
import { buildStudentPack, buildRelationshipPack } from "../utils/auditPack.js";

const router = express.Router();

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

      const pack = await buildStudentPack(student);
      const generatedAt = pack.generatedAt;

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

      // a pending or removed employer must not download the student's details:
      if (relationship.status !== "ACTIVE") {
        return res.status(403).json({
          error: "The student has not given you access, so their audit pack is not available",
        });
      }

      const student = relationship.student;
      const pack = await buildRelationshipPack(relationship);
      const generatedAt = pack.generatedAt;

      await sendPack(res, req, pack, generateRelationshipAuditPackPDF, `audit-pack-${student.universityId}-${generatedAt.toISOString().slice(0, 10)}`);
    } catch (err) {
      console.error("EXPORT AUDIT PACK ERROR:", err);
      res.status(500).json({ error: "Failed to export audit pack" });
    }
  }
);

export default router;

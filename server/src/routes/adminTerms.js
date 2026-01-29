import express from "express";
import prisma from "../prisma.js";
import { authenticate, authorizeRoles } from "../middleware/auth.js";

const router = express.Router();

// view all the terms for a student:
router.get(
  "/students/:universityId/terms",
  authenticate,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    const { universityId } = req.params;

    const student = await prisma.student.findUnique({
      where: { universityId },
      include: { terms: true },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json({
      universityId: student.universityId,
      terms: student.terms,
    });
  }
);


// delete a specific ID:
router.delete(
  "/terms/:termId",
  authenticate,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    const termId = Number(req.params.termId);

    const term = await prisma.term.findUnique({
      where: { id: termId },
      include: { student: true },
    });

    if (!term) {
      return res.status(404).json({ error: "Term not found" });
    }

    await prisma.term.delete({
      where: { id: termId },
    });

    res.json({
      message: "Term deleted successfully",
      deletedTerm: {
        id: term.id,
        name: term.name,
        universityId: term.student.universityId,
      },
    });
  }
);



// delete all the terms for a student:
router.delete(
  "/students/:universityId/terms",
  authenticate,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    const { universityId } = req.params;

    const student = await prisma.student.findUnique({
      where: { universityId },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const result = await prisma.term.deleteMany({
      where: { studentId: student.id },
    });

    res.json({
      message: "All terms deleted successfully",
      deletedCount: result.count,
    });
  }
);

export default router;
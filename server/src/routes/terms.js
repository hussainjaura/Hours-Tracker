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



export default router;
import express from "express";
import prisma from "../prisma.js";
import { authenticate, authorizeRoles } from "../middleware/auth.js";

const router = express.Router();

/**
 * GET all students (ADMIN only)
 */
router.get(
  "/students",
  authenticate,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    const students = await prisma.student.findMany({
      include: {
        user: {
          select: {
            email: true,
            role: true,
          },
        },
      },
    });

    res.json(students);
  }
);


/**
 * GET a single student by ID (ADMIN only)
 */
router.get(
  "/students/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    const studentId = Number(req.params.id);

    if (isNaN(studentId)) {
      return res.status(400).json({ error: "Invalid student ID" });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: {
          select: {
            email: true,
            role: true,
          },
        },
      },
    });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    res.json(student);
  }
);




/**
 * UPDATE any student (ADMIN only)
 */
router.put(
  "/students/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    const studentId = Number(req.params.id);

    const updated = await prisma.student.update({
      where: { id: studentId },
      data: req.body,
    });

    res.json(updated);
  }
);


/**
 * DELETE a student (ADMIN only)
 */
router.delete(
  "/students/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    const studentId = Number(req.params.id);

    // delete student first (FK safety)
    await prisma.student.delete({
      where: { id: studentId },
    });

    res.json({ message: "Student deleted successfully" });
  }
);

export default router;

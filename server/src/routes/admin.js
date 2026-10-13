import express from "express";
import prisma from "../prisma.js";
import { authenticate, authorizeRoles } from "../middleware/auth.js";
import { validate, validateUniversityCode } from "../middleware/validation.js";

const router = express.Router();


// GET all students (ADMIN only):
 
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


// GET a single student by ID (ADMIN only):
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





// UPDATE any student (ADMIN only):
router.put(
  "/students/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    try {
      const studentId = Number(req.params.id);

      // Get old values for audit
      const oldStudent = await prisma.student.findUnique({
        where: { id: studentId },
      });

      if (!oldStudent) {
        return res.status(404).json({ error: "Student not found" });
      }

      const updated = await prisma.student.update({
        where: { id: studentId },
        data: req.body,
      });

      // AUDIT LOG
      await prisma.auditLog.create({
        data: {
          action: "UPDATE_STUDENT_PROFILE",
          entityType: "Student",
          entityId: updated.id,
          performedBy: req.user.id,
          universityId: updated.universityId,
          metadata: {
            before: {
              universityId: oldStudent.universityId,
              visaType: oldStudent.visaType,
              courseEndDate: oldStudent.courseEndDate,
              maxWeeklyHours: oldStudent.maxWeeklyHours,
            },
            after: {
              universityId: updated.universityId,
              visaType: updated.visaType,
              courseEndDate: updated.courseEndDate,
              maxWeeklyHours: updated.maxWeeklyHours,
            },
          },
        },
      });

      res.json(updated);
    } catch (error) {
      console.error("UPDATE STUDENT ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);



// DELETE a student (ADMIN only):
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


// UNIVERSITY CRUD OPERATIONS (ADMIN only):



// GET all universities:
router.get(
  "/universities",
  authenticate,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    try {
      const universities = await prisma.university.findMany({
        include: {
          templates: true,
        },
        orderBy: { name: "asc" },
      });

      res.json(universities);
    } catch (error) {
      console.error("GET UNIVERSITIES ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);


// GET a single university by ID:
router.get(
  "/universities/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    try {
      const universityId = Number(req.params.id);

      if (isNaN(universityId)) {
        return res.status(400).json({ error: "Invalid university ID" });
      }

      const university = await prisma.university.findUnique({
        where: { id: universityId },
        include: {
          templates: {
            orderBy: { startDate: "asc" },
          },
        },
      });

      if (!university) {
        return res.status(404).json({ error: "University not found" });
      }

      res.json(university);
    } catch (error) {
      console.error("GET UNIVERSITY ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);


// CREATE a new university:
router.post(
  "/universities",
  authenticate,
  authorizeRoles("ADMIN"),
  validate([
    { field: 'name', validator: 'required' },
    { field: 'code', validator: 'universityCode' }
  ]),
  async (req, res) => {
    try {
      const { name, code } = req.body;

      const university = await prisma.university.create({
        data: {
          name,
          // Already normalized by validation middleware
          code,
        },
      });

      // AUDIT LOG:
      await prisma.auditLog.create({
        data: {
          action: "CREATE_UNIVERSITY",
          entityType: "University",
          entityId: university.id,
          performedBy: req.user.id,
          universityId: null, // University creation doesn't belong to a university
          metadata: {
            name: university.name,
            code: university.code,
          },
        },
      });

      res.status(201).json(university);
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(409).json({ error: "University code already exists" });
      }

      console.error("CREATE UNIVERSITY ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);


// UPDATE a university:
router.put(
  "/universities/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    try {
      const universityId = Number(req.params.id);
      const { name, code } = req.body;

      if (isNaN(universityId)) {
        return res.status(400).json({ error: "Invalid university ID" });
      }

      // Get old values for audit
      const oldUniversity = await prisma.university.findUnique({
        where: { id: universityId },
      });

      if (!oldUniversity) {
        return res.status(404).json({ error: "University not found" });
      }

      const updateData = {};
      if (name) updateData.name = name;
      if (code) updateData.code = code.toUpperCase();

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          error: "At least one field (name or code) must be provided",
        });
      }

      const updated = await prisma.university.update({
        where: { id: universityId },
        data: updateData,
      });

      // AUDIT LOG:
      await prisma.auditLog.create({
        data: {
          action: "UPDATE_UNIVERSITY",
          entityType: "University",
          entityId: updated.id,
          performedBy: req.user.id,
          // University updates don't belong to a university:
          universityId: null,
          metadata: {
            before: {
              name: oldUniversity.name,
              code: oldUniversity.code,
            },
            after: {
              name: updated.name,
              code: updated.code,
            },
          },
        },
      });

      res.json(updated);
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(409).json({ error: "University code already exists" });
      }

      console.error("UPDATE UNIVERSITY ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);


// DELETE a university:
router.delete(
  "/universities/:id",
  authenticate,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    try {
      const universityId = Number(req.params.id);

      if (isNaN(universityId)) {
        return res.status(400).json({ error: "Invalid university ID" });
      }

      // Get university data for audit before deletion:
      const university = await prisma.university.findUnique({
        where: { id: universityId },
      });

      if (!university) {
        return res.status(404).json({ error: "University not found" });
      }

      // AUDIT LOG (before deletion):
      await prisma.auditLog.create({
        data: {
          action: "DELETE_UNIVERSITY",
          entityType: "University",
          entityId: university.id,
          performedBy: req.user.id,
          // University deletion doesn't belong to a university
          universityId: null,
          metadata: {
            name: university.name,
            code: university.code,
          },
        },
      });

      // This will cascade delete templates due to onDelete: Cascade
      await prisma.university.delete({
        where: { id: universityId },
      });

      res.json({ message: "University deleted successfully" });
    } catch (error) {
      console.error("DELETE UNIVERSITY ERROR:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;

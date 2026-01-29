import express from "express";
import prisma from "../prisma.js";
import { authenticate, authorizeRoles } from "../middleware/auth.js";

const router = express.Router();

// when admin deletes a term he can view all the audit logs!
router.get(
  "/audit-logs",
  authenticate,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    try {
      const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      res.json(logs);
    } catch (err) {
      console.error("AUDIT LOG ERROR:", err);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  }
);

// view audits for a specific uni id
router.get(
  "/audit-logs/student/:universityId",
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

    const logs = await prisma.auditLog.findMany({
        where: { universityId },
        orderBy: { createdAt: "desc" },
    });


    res.json(logs);
  }
);

export default router;
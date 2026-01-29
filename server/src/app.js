// src/app.js
import express from "express";
import cors from "cors";

import authRouter from "./routes/auth.js";
import studentsRouter from "./routes/students.js";
import employerRoutes from "./routes/employer.js";
import adminRoutes from "./routes/admin.js";
import termRoutes from "./routes/terms.js";
import adminTermRoutes from "./routes/adminTerms.js";
import auditRoutes from "./routes/audit.js";


const app = express();

app.use(cors());
app.use(express.json());

app.use("/auth", authRouter);
app.use("/students", studentsRouter);
app.use("/employer", employerRoutes);
app.use("/admin", adminRoutes);
app.use("/terms", termRoutes);
app.use("/adminTerms", adminTermRoutes);
app.use("/audit", auditRoutes);

app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

export default app;

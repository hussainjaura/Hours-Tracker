-- CreateEnum
CREATE TYPE "ViolationType" AS ENUM ('WEEKLY_LIMIT_EXCEEDED', 'COURSE_ENDED', 'TERM_LIMIT_EXCEEDED', 'INVALID_SHIFT_CONFIRMED');

-- CreateEnum
CREATE TYPE "ViolationSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "ComplianceViolation" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "employerId" TEXT,
    "workShiftId" INTEGER,
    "violationType" "ViolationType" NOT NULL,
    "severity" "ViolationSeverity" NOT NULL DEFAULT 'MEDIUM',
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "allowedHours" DECIMAL(5,2) NOT NULL,
    "actualHours" DECIMAL(5,2) NOT NULL,
    "excessHours" DECIMAL(5,2) NOT NULL,
    "inTermTime" BOOLEAN NOT NULL DEFAULT false,
    "activeTermName" TEXT,
    "courseEndDate" TIMESTAMP(3),
    "causedBy" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceViolation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComplianceViolation_studentId_idx" ON "ComplianceViolation"("studentId");

-- CreateIndex
CREATE INDEX "ComplianceViolation_employerId_idx" ON "ComplianceViolation"("employerId");

-- CreateIndex
CREATE INDEX "ComplianceViolation_workShiftId_idx" ON "ComplianceViolation"("workShiftId");

-- CreateIndex
CREATE INDEX "ComplianceViolation_violationType_idx" ON "ComplianceViolation"("violationType");

-- CreateIndex
CREATE INDEX "ComplianceViolation_severity_idx" ON "ComplianceViolation"("severity");

-- CreateIndex
CREATE INDEX "ComplianceViolation_weekStart_idx" ON "ComplianceViolation"("weekStart");

-- CreateIndex
CREATE INDEX "ComplianceViolation_createdAt_idx" ON "ComplianceViolation"("createdAt");

-- AddForeignKey
ALTER TABLE "ComplianceViolation" ADD CONSTRAINT "ComplianceViolation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceViolation" ADD CONSTRAINT "ComplianceViolation_workShiftId_fkey" FOREIGN KEY ("workShiftId") REFERENCES "WorkShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;

/*
  Warnings:

  - Added the required column `academicYear` to the `Term` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Term" ADD COLUMN "academicYear" TEXT;

-- CreateIndex
CREATE INDEX "Term_studentId_academicYear_name_idx" ON "Term"("studentId", "academicYear", "name");

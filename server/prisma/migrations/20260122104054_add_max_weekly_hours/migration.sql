/*
  Warnings:

  - Made the column `termEndDate` on table `Student` required. This step will fail if there are existing NULL values in that column.
  - Made the column `termStartDate` on table `Student` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "maxWeeklyHours" INTEGER NOT NULL DEFAULT 20,
ALTER COLUMN "termEndDate" SET NOT NULL,
ALTER COLUMN "termStartDate" SET NOT NULL;

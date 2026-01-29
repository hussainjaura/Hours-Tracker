/*
  Warnings:

  - You are about to drop the column `maxWeeklyHours` on the `Student` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Student" DROP COLUMN "maxWeeklyHours",
ADD COLUMN     "termEndDate" TIMESTAMP(3),
ADD COLUMN     "termStartDate" TIMESTAMP(3);

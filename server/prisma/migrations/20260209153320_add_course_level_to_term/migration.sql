-- CreateEnum
CREATE TYPE "CourseLevel" AS ENUM ('BELOW_DEGREE', 'DEGREE_OR_ABOVE');

-- AlterTable
ALTER TABLE "Term" ADD COLUMN IF NOT EXISTS "courseLevel" "CourseLevel";

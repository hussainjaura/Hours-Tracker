/*
  Warnings:

  - You are about to drop the column `termEndDate` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `termStartDate` on the `Student` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TermType" AS ENUM ('AUTUMN', 'SPRING', 'SUMMER');

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "termEndDate",
DROP COLUMN "termStartDate";

-- CreateTable
CREATE TABLE "Term" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "name" "TermType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Term_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Term_studentId_name_key" ON "Term"("studentId", "name");

-- AddForeignKey
ALTER TABLE "Term" ADD CONSTRAINT "Term_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

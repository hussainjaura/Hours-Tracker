-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RelationshipStatus" AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "StudentEmployer" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "employerId" TEXT NOT NULL,
    "status" "RelationshipStatus" NOT NULL DEFAULT 'PENDING',
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentEmployer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkShift" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "employerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "hours" DECIMAL(4,2) NOT NULL,
    "description" TEXT,
    "status" "ShiftStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkShift_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentEmployer_employerId_idx" ON "StudentEmployer"("employerId");

-- CreateIndex
CREATE INDEX "StudentEmployer_studentId_idx" ON "StudentEmployer"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentEmployer_studentId_employerId_key" ON "StudentEmployer"("studentId", "employerId");

-- CreateIndex
CREATE INDEX "WorkShift_studentId_date_idx" ON "WorkShift"("studentId", "date");

-- CreateIndex
CREATE INDEX "WorkShift_date_idx" ON "WorkShift"("date");

-- CreateIndex
CREATE INDEX "WorkShift_employerId_idx" ON "WorkShift"("employerId");

-- CreateIndex
CREATE INDEX "WorkShift_status_idx" ON "WorkShift"("status");

-- AddForeignKey
ALTER TABLE "StudentEmployer" ADD CONSTRAINT "StudentEmployer_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkShift" ADD CONSTRAINT "WorkShift_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

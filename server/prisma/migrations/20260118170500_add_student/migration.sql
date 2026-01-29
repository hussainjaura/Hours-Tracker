-- CreateTable
CREATE TABLE "Student" (
    "id" SERIAL NOT NULL,
    "universityId" TEXT NOT NULL,
    "visaType" TEXT NOT NULL,
    "maxWeeklyHours" INTEGER NOT NULL,
    "courseEndDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Student_universityId_key" ON "Student"("universityId");

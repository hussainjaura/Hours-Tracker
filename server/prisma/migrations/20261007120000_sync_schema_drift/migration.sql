-- Brings the migration history in line with the database.
-- These changes were applied to the dev database earlier (via db push) without a
-- migration, so a fresh database built from migrations was missing them.
-- On the existing dev database this migration is marked as already applied.

-- CreateEnum
CREATE TYPE "public"."EmployerRole" AS ENUM ('MANAGER', 'HR', 'OWNER');
-- AlterTable
ALTER TABLE "public"."AuditLog" ADD COLUMN     "acknowledgementText" TEXT,
ADD COLUMN     "changeHistory" JSONB,
ADD COLUMN     "complianceRule" JSONB,
ADD COLUMN     "declarationText" TEXT,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "userAgent" TEXT;
-- AlterTable
ALTER TABLE "public"."StudentEmployer" ADD COLUMN     "acknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "acknowledgedBy" TEXT;
-- AlterTable
ALTER TABLE "public"."Term" ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedBy" TEXT;
-- CreateTable
CREATE TABLE "public"."Employer" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "workEmail" TEXT NOT NULL,
    "role" "public"."EmployerRole" NOT NULL,
    "organisationName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLogin" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "lastLoginUserAgent" TEXT,
    "acknowledgementIps" JSONB,
    CONSTRAINT "Employer_pkey" PRIMARY KEY ("id")
);
-- CreateTable
CREATE TABLE "public"."PasswordResetToken" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);
-- CreateIndex
CREATE INDEX "Employer_userId_idx" ON "public"."Employer"("userId" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "Employer_userId_key" ON "public"."Employer"("userId" ASC);
-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "public"."PasswordResetToken"("expiresAt" ASC);
-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "public"."PasswordResetToken"("token" ASC);
-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "public"."PasswordResetToken"("token" ASC);
-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "public"."PasswordResetToken"("userId" ASC);
-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "public"."AuditLog"("action" ASC);
-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "public"."AuditLog"("createdAt" ASC);
-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "public"."AuditLog"("entityType" ASC, "entityId" ASC);
-- CreateIndex
CREATE INDEX "AuditLog_performedBy_idx" ON "public"."AuditLog"("performedBy" ASC);
-- CreateIndex
CREATE INDEX "AuditLog_universityId_idx" ON "public"."AuditLog"("universityId" ASC);
-- AddForeignKey
ALTER TABLE "public"."Employer" ADD CONSTRAINT "Employer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "public"."PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

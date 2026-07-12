-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."Applicant" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3) NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ja',
    "status" TEXT NOT NULL DEFAULT 'invited',
    "cardImage" BYTEA,
    "cardImageIv" TEXT,
    "cardUploadedAt" TIMESTAMP(3),
    "ocrStatus" TEXT NOT NULL DEFAULT 'none',
    "ocrResult" JSONB,
    "workRestriction" TEXT,
    "cardNumberLast4" TEXT,
    "cardExpiryDate" TEXT,
    "ocrCount" INTEGER NOT NULL DEFAULT 0,
    "draft" JSONB,
    "submittedData" JSONB,
    "submittedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Applicant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditEvent" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Applicant_status_idx" ON "public"."Applicant"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_token_key" ON "public"."Applicant"("token" ASC);

-- CreateIndex
CREATE INDEX "AuditEvent_applicantId_idx" ON "public"."AuditEvent"("applicantId" ASC);

-- AddForeignKey
ALTER TABLE "public"."AuditEvent" ADD CONSTRAINT "AuditEvent_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "public"."Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


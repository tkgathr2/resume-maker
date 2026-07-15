-- AlterTable: Applicant に JIS項目追加
ALTER TABLE "Applicant" ADD COLUMN "commuteTime" TEXT,
ADD COLUMN "dependents" TEXT,
ADD COLUMN "maritalStatus" TEXT,
ADD COLUMN "requests" TEXT,
ADD COLUMN "pdfGeneratedAt" TIMESTAMP(3);

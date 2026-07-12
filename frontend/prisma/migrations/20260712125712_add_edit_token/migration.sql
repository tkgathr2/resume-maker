-- AlterTable: add self-edit token hash + last-editor tracking to Applicant
ALTER TABLE "Applicant" ADD COLUMN "editTokenHash" TEXT;
ALTER TABLE "Applicant" ADD COLUMN "updatedBy" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Applicant_editTokenHash_key" ON "Applicant"("editTokenHash");

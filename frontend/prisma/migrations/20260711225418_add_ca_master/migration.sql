-- CreateTable CA
CREATE TABLE "CA" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CA_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for CA.name
CREATE UNIQUE INDEX "CA_name_key" ON "CA"("name");

-- CreateIndex for CA.code
CREATE UNIQUE INDEX "CA_code_key" ON "CA"("code");

-- AlterTable Applicant
ALTER TABLE "Applicant" ADD COLUMN "caId" TEXT;

-- CreateIndex for Applicant.caId
CREATE INDEX "Applicant_caId_idx" ON "Applicant"("caId");

-- AddForeignKey
ALTER TABLE "Applicant" ADD CONSTRAINT "Applicant_caId_fkey" FOREIGN KEY ("caId") REFERENCES "CA"("id") ON DELETE SET NULL ON UPDATE CASCADE;

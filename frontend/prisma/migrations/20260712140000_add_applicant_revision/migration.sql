-- CreateTable: 修正のバージョン保存（更新前スナップショット）
CREATE TABLE "ApplicantRevision" (
    "id" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "changedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicantRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApplicantRevision_applicantId_idx" ON "ApplicantRevision"("applicantId");

-- AddForeignKey
ALTER TABLE "ApplicantRevision" ADD CONSTRAINT "ApplicantRevision_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

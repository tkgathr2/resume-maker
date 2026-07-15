-- AddColumn: templateType を Applicant テーブルに追加（デフォルト: 'jis'）
ALTER TABLE "Applicant" ADD COLUMN "templateType" TEXT NOT NULL DEFAULT 'jis';

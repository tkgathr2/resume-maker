// サンプルデータでJIS履歴書PDFを実生成し、tmp/sample-resume.pdf に書き出す検証スクリプト。
// 実行: npx tsx scripts/test-pdf.ts (frontend/ ディレクトリで実行すること)
import fs from 'fs';
import path from 'path';
import { EMPTY_RESUME } from '../lib/resumeFields';
import { toJisResumeData, renderJisResumePdf } from '../lib/pdf/resumePdf';

async function main() {
  const source = {
    fullName: '山田 太郎',
    furigana: 'ヤマダ タロウ',
    birthDate: '1998-05-03',
    gender: '男性',
    nationality: 'ベトナム',
    visaStatus: '技術・人文知識・国際業務',
    visaExpiry: '2027-04-01',
    workRestriction: '就労制限なし',
    address: '東京都渋谷区〇〇1-2-3',
    phone: '090-1234-5678',
    email: 'taro.yamada@example.com',
    education: '2016年4月 〇〇高等学校 入学\n2019年3月 〇〇高等学校 卒業',
    workHistory: '2019年4月 株式会社〇〇 入社\n2023年3月 株式会社〇〇 退社',
    qualifications: '普通自動車第一種運転免許\n日本語能力試験N2',
    motivation: '御社の◯◯事業に強く興味を持ち、これまでの経験を活かして貢献したいと考えています。',
    // JIS追加項目（Applicant に対応列が無いため、フォーム側で今後キーとして流し込まれる想定）
    commuteTime: '約45分',
    dependentsCount: '0人',
    maritalStatus: '無',
    requests: '特になし',
  };

  const data = toJisResumeData(EMPTY_RESUME, source);
  const pdf = await renderJisResumePdf(data);

  const outDir = path.join(process.cwd(), 'tmp');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'sample-resume.pdf');
  fs.writeFileSync(outPath, pdf);

  const sizeBytes = fs.statSync(outPath).size;
  console.log(`generated: ${outPath}`);
  console.log(`size: ${sizeBytes} bytes`);

  if (sizeBytes <= 10 * 1024) {
    console.error('FAIL: PDF size <= 10KB, likely broken render');
    process.exit(1);
  }
  console.log('OK: size > 10KB');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

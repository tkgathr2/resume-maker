/**
 * マラトゥテンプレート履歴書 PDF 生成
 * pdfkit を使用した動的 PDF 生成
 * 言語対応：ja / en / vi / ne
 */

import PDFDocument from "pdfkit";

export interface ApplicantData {
  displayName: string;
  cardNumberLast4?: string;
  cardExpiryDate?: string;
  submittedData?: Record<string, any>;
  locale?: string;
}

// 言語別ラベル定義
const labels = {
  ja: {
    name: "氏名",
    contact: "連絡先",
    cardNumber: "在留カード番号（下4桁）",
    expiryDate: "有効期限",
    workRestriction: "就労制限",
    summary: "職務経歴",
  },
  en: {
    name: "Name",
    contact: "Contact",
    cardNumber: "Residence Card (Last 4 digits)",
    expiryDate: "Expiry Date",
    workRestriction: "Work Restriction",
    summary: "Work Experience",
  },
  vi: {
    name: "Tên",
    contact: "Liên hệ",
    cardNumber: "Số thẻ cư trú (4 chữ số cuối)",
    expiryDate: "Ngày hết hạn",
    workRestriction: "Hạn chế làm việc",
    summary: "Kinh nghiệm làm việc",
  },
  ne: {
    name: "नाम",
    contact: "संपर्क",
    cardNumber: "आवास कार्ड संख्या (अंतिम 4 अंक)",
    expiryDate: "समाप्ति तारीख",
    workRestriction: "कार्य प्रतिबंध",
    summary: "कार्य अनुभव",
  },
} as const;

export function renderMarathuResumePdf(
  applicantData: ApplicantData,
  locale: string = "ja"
): Buffer {
  const doc = new PDFDocument({
    size: "A4",
    margin: 40,
  });

  const buffer: Buffer[] = [];
  doc.on("data", (chunk) => buffer.push(chunk));
  doc.on("end", () => {});

  const lang = locale in labels ? (locale as keyof typeof labels) : "ja";
  const t = labels[lang];
  const { submittedData = {}, displayName, cardNumberLast4, cardExpiryDate } = applicantData;

  // ===== タイトル =====
  doc.fontSize(24).font("Helvetica-Bold").text("Curriculum Vitae", { align: "center" });
  doc.moveDown();

  // ===== 基本情報セクション =====
  doc.fontSize(12).font("Helvetica-Bold").text(t.name);
  doc.fontSize(11).font("Helvetica").text(displayName || "");
  doc.moveDown();

  // 在留カード情報（マラトゥ特有）
  if (cardNumberLast4 || cardExpiryDate) {
    doc.fontSize(10).font("Helvetica-Bold").text(t.cardNumber);
    doc.fontSize(10)
      .font("Helvetica")
      .text(cardNumberLast4 ? `****${cardNumberLast4}` : "-");
    doc.moveDown();

    doc.fontSize(10).font("Helvetica-Bold").text(t.expiryDate);
    doc.fontSize(10).font("Helvetica").text(cardExpiryDate || "-");
    doc.moveDown();
  }

  // ===== 職務経歴セクション =====
  doc.fontSize(12).font("Helvetica-Bold").text(t.summary);
  doc.moveDown(0.5);

  if (submittedData.workHistory && Array.isArray(submittedData.workHistory)) {
    submittedData.workHistory.forEach((entry: Record<string, any>) => {
      doc.fontSize(10).font("Helvetica-Bold").text(entry.company || "");
      doc.fontSize(9)
        .font("Helvetica-Oblique")
        .text(`${entry.startDate || ""} - ${entry.endDate || ""}`);
      doc.fontSize(9).font("Helvetica").text(entry.description || "");
      doc.moveDown();
    });
  } else {
    doc.fontSize(9).font("Helvetica").text("(No work history)");
    doc.moveDown();
  }

  // ===== 備考 =====
  if (submittedData.notes) {
    doc.fontSize(10).font("Helvetica-Bold").text("Remarks");
    doc.fontSize(9).font("Helvetica").text(submittedData.notes);
  }

  // PDF 生成完了
  doc.end();

  return Buffer.concat(buffer);
}

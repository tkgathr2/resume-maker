import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFile } from 'fs/promises';
import path from 'path';

export interface ResumeData {
  fullName: string;
  email?: string;
  phone?: string;
  summary?: string;
  experience?: string;
  education?: string;
  skills?: string;
}

let cachedFont: Buffer | null = null;

// Loads the bundled Japanese-capable TrueType font (subset-embedded by pdf-lib).
async function loadJpFont(): Promise<Buffer | null> {
  if (cachedFont) return cachedFont;
  try {
    const p = path.join(process.cwd(), 'assets', 'NotoSansJP-Regular.ttf');
    cachedFont = await readFile(p);
    return cachedFont;
  } catch {
    return null;
  }
}

const PAGE_W = 595.28; // A4 width in pt
const PAGE_H = 841.89; // A4 height in pt
const MARGIN = 56;
const LINE = 16;

// Generates a resume PDF and returns it as a Buffer.
export async function generateResumePdf(data: ResumeData): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const jpBytes = await loadJpFont();
  let font: PDFFont;
  let bold: PDFFont;
  if (jpBytes) {
    // Same font for regular + bold (Noto handles both readably at basic level).
    font = await doc.embedFont(jpBytes, { subset: true });
    bold = font;
  } else {
    font = await doc.embedFont(StandardFonts.Helvetica);
    bold = await doc.embedFont(StandardFonts.HelveticaBold);
  }

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const newPageIfNeeded = (needed: number) => {
    if (y - needed < MARGIN) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  // Wraps text to fit page width at a given font size.
  const wrap = (text: string, size: number, f: PDFFont): string[] => {
    const maxWidth = PAGE_W - MARGIN * 2;
    const out: string[] = [];
    for (const rawLine of text.split(/\r?\n/)) {
      if (rawLine.trim() === '') {
        out.push('');
        continue;
      }
      // Character-based wrapping works for both CJK and Latin.
      let cur = '';
      for (const ch of rawLine) {
        const test = cur + ch;
        if (f.widthOfTextAtSize(test, size) > maxWidth && cur !== '') {
          out.push(cur);
          cur = ch;
        } else {
          cur = test;
        }
      }
      if (cur !== '') out.push(cur);
    }
    return out;
  };

  const drawText = (text: string, size: number, f: PDFFont, color = rgb(0.1, 0.1, 0.1)) => {
    for (const line of wrap(text, size, f)) {
      newPageIfNeeded(LINE);
      if (line !== '') {
        page.drawText(line, { x: MARGIN, y, size, font: f, color });
      }
      y -= size + 4;
    }
  };

  const section = (title: string, body?: string) => {
    if (!body || body.trim() === '') return;
    y -= 8;
    newPageIfNeeded(LINE * 2);
    page.drawText(title, { x: MARGIN, y, size: 13, font: bold, color: rgb(0.15, 0.35, 0.6) });
    y -= 6;
    page.drawLine({
      start: { x: MARGIN, y: y - 2 },
      end: { x: PAGE_W - MARGIN, y: y - 2 },
      thickness: 1,
      color: rgb(0.15, 0.35, 0.6),
    });
    y -= 14;
    drawText(body, 11, font);
  };

  // Header: name
  page.drawText(data.fullName || 'Resume', {
    x: MARGIN,
    y,
    size: 24,
    font: bold,
    color: rgb(0.1, 0.1, 0.1),
  });
  y -= 30;

  // Contact line
  const contact = [data.email, data.phone].filter(Boolean).join('  |  ');
  if (contact) {
    page.drawText(contact, { x: MARGIN, y, size: 11, font, color: rgb(0.3, 0.3, 0.3) });
    y -= 18;
  }

  section('概要 / Summary', data.summary);
  section('職務経歴 / Experience', data.experience);
  section('学歴 / Education', data.education);
  section('スキル / Skills', data.skills);

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

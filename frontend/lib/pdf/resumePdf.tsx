import path from 'path';
import React from 'react';
import { Document, Page, Text, View, Font, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import type { ResumeData, HistoryRow } from '../resumeFields';
import { pickJisExtra, type JisExtraFields, type JisHistoryFields } from '../resumeFields';

// JIS標準様式に準拠した履歴書PDF（A4縦）。
// Applicant モデル（schema.prisma）には対応していない項目
// （本人希望記入欄・通勤時間・扶養家族数・配偶者・学歴職歴/資格の行リスト）があるため、
// それらは submittedData/draft の JSON blob に該当キーがあれば拾い、
// 無ければ空欄枠として描画する（管理画面 admin/[id] がCA専用で書き込む。schema変更なし）。
//
// 同梱フォント: frontend/fonts/NotoSansJP-Regular.otf
// （既存の lib/resumePdf.tsx と同じフォントファイルを再利用。日本語文字化け対策）
Font.register({
  family: 'NotoSansJP',
  src: path.join(process.cwd(), 'fonts', 'NotoSansJP-Regular.otf'),
});

export type { JisExtraFields, JisHistoryFields, HistoryRow };
export type JisResumeData = ResumeData & JisExtraFields & JisHistoryFields;

// submittedData/draft の JSON blob（未知キー許容）から JisResumeData を組み立てる。
// resumeFields.ts の EMPTY_RESUME を渡すことで、既存項目は共通のデフォルトに揃える。
export function toJisResumeData(
  emptyResume: ResumeData,
  source: (Partial<ResumeData> & Record<string, unknown>) | null | undefined
): JisResumeData {
  return {
    ...emptyResume,
    ...(source ?? {}),
    ...pickJisExtra(source ?? null),
  };
}

// 生年月日文字列（ISO想定、他形式もDateパース可能なら許容）から満年齢を計算。
// パース不能な場合は空文字（空欄枠として表示）。
export function calcAge(birthDate: string, asOf: Date = new Date()): string {
  if (!birthDate) return '';
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return '';
  let age = asOf.getFullYear() - d.getFullYear();
  const monthDiff = asOf.getMonth() - d.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < d.getDate())) {
    age -= 1;
  }
  return age >= 0 && age < 150 ? String(age) : '';
}

const s = StyleSheet.create({
  page: { fontFamily: 'NotoSansJP', fontSize: 9.5, padding: 32, color: '#111' },
  title: { fontSize: 20, marginBottom: 4, textAlign: 'center' },
  dateLine: { fontSize: 9, textAlign: 'right', marginBottom: 8 },
  table: { borderWidth: 1, borderColor: '#333' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#333' },
  rowLast: { flexDirection: 'row' },
  label: {
    width: 82,
    padding: 5,
    backgroundColor: '#f2f4f0',
    borderRightWidth: 1,
    borderRightColor: '#333',
    fontSize: 8.5,
  },
  halfLabel: {
    width: 60,
    padding: 5,
    backgroundColor: '#f2f4f0',
    borderRightWidth: 1,
    borderRightColor: '#333',
    fontSize: 8.5,
  },
  value: { flex: 1, padding: 5 },
  halfValue: { width: 90, padding: 5, borderRightWidth: 1, borderRightColor: '#333' },
  photoBox: {
    position: 'absolute',
    right: 32,
    top: 56,
    width: 82,
    height: 106,
    borderWidth: 1,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoText: { fontSize: 8, color: '#999' },
  sectionTitle: { fontSize: 11, marginTop: 10, marginBottom: 3 },
  block: { borderWidth: 1, borderColor: '#333', padding: 6, minHeight: 44 },
  historyTable: { borderWidth: 1, borderColor: '#333', marginTop: 2 },
  historyHeaderRow: { flexDirection: 'row', backgroundColor: '#f2f4f0', borderBottomWidth: 1, borderBottomColor: '#333' },
  historyHeaderCellYM: { width: 70, padding: 4, fontSize: 8.5, textAlign: 'center', borderRightWidth: 1, borderRightColor: '#333' },
  historyHeaderCellBody: { flex: 1, padding: 4, fontSize: 8.5, textAlign: 'center' },
  historyRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#333', minHeight: 16 },
  historyRowLast: { flexDirection: 'row', minHeight: 16 },
  historyCellYM: { width: 70, padding: 3, fontSize: 8.5, borderRightWidth: 1, borderRightColor: '#333' },
  historyCellBody: { flex: 1, padding: 3, fontSize: 8.5 },
  historySectionLabel: { fontSize: 8.5, fontWeight: 700 },
});

function Row({ label, value, last, half }: { label: string; value: string; last?: boolean; half?: boolean }) {
  return (
    <View style={last ? s.rowLast : s.row}>
      <Text style={half ? s.halfLabel : s.label}>{label}</Text>
      <Text style={half ? s.halfValue : s.value}>{value || ' '}</Text>
    </View>
  );
}

// 学歴/職歴のフリーテキストを改行分割し、テーブルの行として描画するための行データを作る。
// データが無い場合も枠の体裁を保つため最低1行の空行を出す。
function toHistoryLines(text: string): string[] {
  const lines = (text || '').split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  return lines.length > 0 ? lines : [''];
}

// 年・月・内容の行リスト（admin画面で入力）を「年月」列＋「内容」列の2列描画用に変換。
// 空配列なら null を返し、呼び出し側で従来の自由記述文字列にフォールバックさせる。
function toHistoryRowLines(rows: HistoryRow[]): { ym: string; content: string }[] | null {
  const filled = rows.filter((r) => r.year || r.month || r.content);
  if (filled.length === 0) return null;
  return filled.map((r) => ({
    ym: [r.year, r.month].filter(Boolean).join('/'),
    content: r.content,
  }));
}

function HistorySectionLabelRow({ label }: { label: string }) {
  return (
    <View style={s.historyRow}>
      <Text style={s.historyCellYM}> </Text>
      <Text style={[s.historyCellBody, s.historySectionLabel]}>{label}</Text>
    </View>
  );
}

function HistoryLineRow({ ym, line, last }: { ym?: string; line: string; last?: boolean }) {
  return (
    <View style={last ? s.historyRowLast : s.historyRow}>
      <Text style={s.historyCellYM}>{ym || ' '}</Text>
      <Text style={s.historyCellBody}>{line || ' '}</Text>
    </View>
  );
}

function ResumeDoc({ data }: { data: JisResumeData }) {
  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日 現在`;
  const age = calcAge(data.birthDate, today);
  // admin画面の年・月・内容の行リストがあればそちらを優先し、無ければ従来の
  // 自由記述文字列（改行区切り）にフォールバックする（既存の提出済みデータ互換）。
  const eduRowLines = toHistoryRowLines(data.educationHistory);
  const workRowLines = toHistoryRowLines(data.workHistoryRows);
  const qualRowLines = toHistoryRowLines(data.qualificationRows);
  const eduLines = eduRowLines ?? toHistoryLines(data.education).map((line) => ({ ym: '', content: line }));
  const workLines = workRowLines ?? toHistoryLines(data.workHistory).map((line) => ({ ym: '', content: line }));

  return (
    <Document title={`履歴書 ${data.fullName}`}>
      <Page size="A4" style={s.page}>
        <Text style={s.title}>履 歴 書</Text>
        <Text style={s.dateLine}>{dateStr}</Text>

        <View style={s.photoBox}>
          <Text style={s.photoText}>写真</Text>
        </View>

        <View style={[s.table, { width: 420 }]}>
          <Row label="ふりがな" value={data.furigana} />
          <Row label="氏名" value={data.fullName} />
          <View style={s.row}>
            <Text style={s.halfLabel}>生年月日</Text>
            <Text style={s.halfValue}>{data.birthDate ? `${data.birthDate}（満${age || ' '}歳）` : ' '}</Text>
            <Text style={s.halfLabel}>性別</Text>
            <Text style={s.value}>{data.gender || ' '}</Text>
          </View>
          <Row label="現住所" value={data.address} last />
        </View>

        <View style={[s.table, { marginTop: 8 }]}>
          <Row label="電話番号" value={data.phone} />
          <Row label="メール" value={data.email} last />
        </View>

        <Text style={s.sectionTitle}>学歴・職歴</Text>
        <View style={s.historyTable}>
          <View style={s.historyHeaderRow}>
            <Text style={s.historyHeaderCellYM}>年　月</Text>
            <Text style={s.historyHeaderCellBody}>学歴・職歴</Text>
          </View>
          <HistorySectionLabelRow label="学歴" />
          {eduLines.map((line, i) => (
            <HistoryLineRow key={`edu-${i}`} ym={line.ym} line={line.content} />
          ))}
          <HistorySectionLabelRow label="職歴" />
          {workLines.map((line, i) => (
            <HistoryLineRow key={`work-${i}`} ym={line.ym} line={line.content} last={i === workLines.length - 1} />
          ))}
        </View>

        <Text style={s.sectionTitle}>免許・資格</Text>
        {qualRowLines ? (
          <View style={s.historyTable}>
            {qualRowLines.map((line, i) => (
              <HistoryLineRow key={`qual-${i}`} ym={line.ym} line={line.content} last={i === qualRowLines.length - 1} />
            ))}
          </View>
        ) : (
          <View style={[s.block, { minHeight: 40 }]}>
            <Text>{data.qualifications || ' '}</Text>
          </View>
        )}

        <Text style={s.sectionTitle}>志望動機・自己PR</Text>
        <View style={s.block}>
          <Text>{data.motivation || ' '}</Text>
        </View>

        <Text style={s.sectionTitle}>本人希望記入欄</Text>
        <View style={s.block}>
          <Text>{data.requests || ' '}</Text>
        </View>

        <View style={[s.table, { marginTop: 8 }]}>
          <View style={s.row}>
            <Text style={s.halfLabel}>通勤時間</Text>
            <Text style={s.halfValue}>{data.commuteTime || ' '}</Text>
            <Text style={s.halfLabel}>扶養家族数</Text>
            <Text style={s.halfValue}>{data.dependents || ' '}</Text>
          </View>
          <View style={s.rowLast}>
            <Text style={s.halfLabel}>配偶者</Text>
            <Text style={s.value}>{data.maritalStatus || ' '}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function renderJisResumePdf(data: JisResumeData): Promise<Buffer> {
  return renderToBuffer(<ResumeDoc data={data} />);
}

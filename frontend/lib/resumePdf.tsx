import path from 'path';
import React from 'react';
import { Document, Page, Text, View, Font, StyleSheet, renderToBuffer } from '@react-pdf/renderer';
import type { ResumeData } from '@/lib/resumeFields';

// JIS風 履歴書PDF（A4縦）。NotoSansJP を同梱フォントとして登録。
Font.register({
  family: 'NotoSansJP',
  src: path.join(process.cwd(), 'fonts', 'NotoSansJP-Regular.otf'),
});

const s = StyleSheet.create({
  page: { fontFamily: 'NotoSansJP', fontSize: 10, padding: 36, color: '#111' },
  title: { fontSize: 20, marginBottom: 4 },
  dateLine: { fontSize: 9, textAlign: 'right', marginBottom: 8 },
  table: { borderWidth: 1, borderColor: '#333' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#333' },
  rowLast: { flexDirection: 'row' },
  label: {
    width: 90,
    padding: 6,
    backgroundColor: '#f2f4f0',
    borderRightWidth: 1,
    borderRightColor: '#333',
    fontSize: 9,
  },
  value: { flex: 1, padding: 6 },
  photoBox: {
    position: 'absolute',
    right: 36,
    top: 60,
    width: 85,
    height: 110,
    borderWidth: 1,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoText: { fontSize: 8, color: '#999' },
  sectionTitle: { fontSize: 12, marginTop: 14, marginBottom: 4 },
  block: { borderWidth: 1, borderColor: '#333', padding: 8, minHeight: 70 },
});

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={last ? s.rowLast : s.row}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value || ' '}</Text>
    </View>
  );
}

function ResumeDoc({ data }: { data: ResumeData }) {
  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日 現在`;
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
          <Row label="生年月日" value={data.birthDate} />
          <Row label="性別" value={data.gender} />
          <Row label="国籍" value={data.nationality} />
        </View>
        <View style={[s.table, { marginTop: 10 }]}>
          <Row label="現住所" value={data.address} />
          <Row label="電話番号" value={data.phone} />
          <Row label="メール" value={data.email} />
          <Row label="在留資格" value={data.visaStatus} />
          <Row label="在留期限" value={data.visaExpiry} last />
        </View>
        <Text style={s.sectionTitle}>学歴</Text>
        <View style={s.block}>
          <Text>{data.education || ' '}</Text>
        </View>
        <Text style={s.sectionTitle}>職歴</Text>
        <View style={s.block}>
          <Text>{data.workHistory || ' '}</Text>
        </View>
        <Text style={s.sectionTitle}>免許・資格</Text>
        <View style={[s.block, { minHeight: 50 }]}>
          <Text>{data.qualifications || ' '}</Text>
        </View>
        <Text style={s.sectionTitle}>志望動機・アピール</Text>
        <View style={s.block}>
          <Text>{data.motivation || ' '}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderResumePdf(data: ResumeData): Promise<Buffer> {
  return renderToBuffer(<ResumeDoc data={data} />);
}

// 在留カード OCR — Claude Haiku 4.5 vision（社長決定 2026-07-05・実測3秒/枚）
// カード番号はフル値を返すが、保存側で下4桁のみ残す（要件 TBD-002 推奨値）。

export interface OcrFields {
  fullName: string | null; // ローマ字氏名（漢字併記があれば漢字優先）
  birthDate: string | null; // YYYY-MM-DD
  gender: string | null; // 男 / 女 / M / F
  nationality: string | null;
  address: string | null;
  visaStatus: string | null; // 在留資格
  visaExpiry: string | null; // 在留期間満了日 YYYY-MM-DD
  workRestriction: string | null;
  cardNumber: string | null;
  cardExpiry: string | null;
  confidence: Record<string, number>;
}

const PROMPT = `この画像は日本の在留カードです。次の項目をJSONで抽出してください。読み取れない項目はnull。日付はYYYY-MM-DD形式。confidenceは各項目の読み取り確度(0.0-1.0)。
{"fullName":"氏名(漢字併記があれば漢字、なければローマ字のまま)","birthDate":"生年月日","gender":"性別(男/女)","nationality":"国籍・地域","address":"住居地","visaStatus":"在留資格","visaExpiry":"在留期間の満了日","workRestriction":"就労制限の有無の記載そのまま","cardNumber":"在留カード番号","cardExpiry":"カード有効期間満了日","confidence":{"fullName":0.9,...}}
在留カードでない画像の場合は {"error":"not_a_residence_card"} を返す。JSONのみ出力。`;

export async function runCardOcr(imageBase64: string, mediaType: string): Promise<OcrFields | { error: string }> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`anthropic ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  const text: string = json.content?.[0]?.text ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('no JSON in OCR response');
  return JSON.parse(match[0]);
}

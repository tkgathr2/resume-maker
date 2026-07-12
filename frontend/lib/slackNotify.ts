// 履歴書メーカー 提出/修正の Slack 自動通知（#su_履歴書メーカー通知 = C0BGRNRQ45Q）。
// 社内標準パターン（kaizen-mado/lib/slack.ts と同じ: fetch直叩き + SLACK_BOT_TOKEN）に相乗り。
// SLACK_BOT_TOKEN 未設定なら完全無効（fail-safe）。投稿失敗も例外を投げず、
// 提出/修正フロー自体は必ず成功扱いにする（呼び出し側は try-catch で包む）。

const SLACK_POST_URL = 'https://slack.com/api/chat.postMessage';
const NOTIFY_CHANNEL = 'C0BGRNRQ45Q'; // #su_履歴書メーカー通知
const ADMIN_URL = 'https://rirekimeka.takagi.bz/admin';
const POST_TIMEOUT_MS = 8000;

function slackEnabled(): boolean {
  return Boolean(process.env.SLACK_BOT_TOKEN && process.env.SLACK_BOT_TOKEN.trim());
}

async function postToSlack(text: string): Promise<boolean> {
  const token = process.env.SLACK_BOT_TOKEN?.trim();
  if (!token) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), POST_TIMEOUT_MS);
  try {
    const res = await fetch(SLACK_POST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ channel: NOTIFY_CHANNEL, text }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => null);
    if (!data?.ok) {
      console.warn('[slackNotify] postMessage failed:', data?.error ?? `http ${res.status}`);
    }
    return Boolean(data?.ok);
  } catch (err) {
    console.warn('[slackNotify] postMessage error:', (err as Error).message);
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// 新規提出時の通知。
export async function notifySubmit(
  displayName: string,
  caName: string | null,
  applicantId: string
): Promise<void> {
  if (!slackEnabled()) return;
  const detailUrl = `${ADMIN_URL}/${applicantId}`;
  const text = `新しい履歴書が提出されました：${displayName} / 担当CA: ${caName ?? '未設定'}\n詳細・修正・PDF: ${detailUrl}`;
  await postToSlack(text);
}

// 本人「後から修正」時の通知。
export async function notifySelfEdit(displayName: string): Promise<void> {
  if (!slackEnabled()) return;
  const text = `提出内容が本人修正されました：${displayName}`;
  await postToSlack(text);
}

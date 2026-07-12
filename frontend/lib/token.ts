import crypto from 'crypto';

// 「後から修正」本人トークン用ユーティリティ。
// 平文トークンは発行の瞬間しかレスポンスに載らず、DB には SHA-256 ハッシュのみ保存する。

// 256bit ランダム・URLセーフなトークンを新規発行。
export function generateEditToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

// DB 保存用ハッシュ（hex）。
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// トークンが保存済みハッシュと一致するかを定時間比較で検証。
export function verifyToken(token: string, storedHash: string): boolean {
  const computed = Buffer.from(hashToken(token), 'hex');
  const expected = Buffer.from(storedHash, 'hex');
  if (computed.length !== expected.length) return false;
  return crypto.timingSafeEqual(computed, expected);
}

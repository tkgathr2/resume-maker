import crypto from 'crypto';

// AES-256-GCM application-level encryption for the residence-card image.
// ENCRYPTION_KEY: base64-encoded 32 bytes.
function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error('ENCRYPTION_KEY is not set');
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes (base64)');
  return key;
}

export function encryptBuffer(plain: Buffer): { data: Buffer; iv: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain), cipher.final(), cipher.getAuthTag()]);
  return { data: enc, iv: iv.toString('base64') };
}

export function decryptBuffer(data: Buffer, ivB64: string): Buffer {
  const iv = Buffer.from(ivB64, 'base64');
  const tag = data.subarray(data.length - 16);
  const body = data.subarray(0, data.length - 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]);
}

export function newInviteToken(): string {
  // 24 bytes = 192 bits, URL-safe.
  return crypto.randomBytes(24).toString('base64url');
}

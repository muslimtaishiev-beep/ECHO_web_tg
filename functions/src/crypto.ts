// Node.js AES-256-GCM helpers.
//
// These mirror the Web Crypto implementation in web/src/lib/crypto.js:
// the 16-byte GCM auth tag is APPENDED to the ciphertext and stored as a
// single base64 `content` blob, with a separate 12-byte `iv`. This keeps
// messages encrypted by the Telegram bot decryptable in the browser and
// vice-versa.

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export function encryptRoom(plaintext: string, keyBase64: string): { content: string; iv: string } {
  const key = Buffer.from(keyBase64, 'base64');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    content: Buffer.concat([ciphertext, tag]).toString('base64'),
    iv: iv.toString('base64'),
  };
}

export function decryptRoom(contentB64: string, ivB64: string, keyBase64: string): string {
  const key = Buffer.from(keyBase64, 'base64');
  const iv = Buffer.from(ivB64, 'base64');
  const data = Buffer.from(contentB64, 'base64');
  const tag = data.subarray(data.length - 16);
  const ciphertext = data.subarray(0, data.length - 16);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

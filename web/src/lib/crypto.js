// AES-256-GCM encryption/decryption using the Web Crypto API.
//
// Compatibility note: the Web Crypto API appends the 16-byte GCM auth tag
// to the end of the ciphertext. We store that combined blob as `content`
// (base64) together with the `iv` (base64). The Telegram Cloud Function
// uses the same convention (see functions/src/crypto.ts), so messages
// encrypted by the bot can be decrypted here and vice-versa.

const ALGO = 'AES-GCM'

function toBase64(bytes) {
  let binary = ''
  bytes.forEach((b) => { binary += String.fromCharCode(b) })
  return btoa(binary)
}

function fromBase64(b64) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function importKey(keyBase64) {
  return crypto.subtle.importKey(
    'raw',
    fromBase64(keyBase64),
    { name: ALGO },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** Generate a fresh 256-bit key for a chat room (base64). */
export function generateRoomKey() {
  const key = new Uint8Array(32)
  crypto.getRandomValues(key)
  return toBase64(key)
}

/** Encrypt plaintext with a base64 key. Returns { content, iv } (both base64). */
export async function encrypt(plaintext, keyBase64) {
  const key = await importKey(keyBase64)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    new TextEncoder().encode(plaintext),
  )
  return {
    content: toBase64(new Uint8Array(ciphertext)),
    iv: toBase64(iv),
  }
}

/** Decrypt { content, iv } (base64) with a base64 key. */
export async function decrypt(contentB64, ivB64, keyBase64) {
  const key = await importKey(keyBase64)
  const iv = fromBase64(ivB64)
  const ciphertext = fromBase64(contentB64)
  const plaintext = await crypto.subtle.decrypt(
    { name: ALGO, iv },
    key,
    ciphertext,
  )
  return new TextDecoder().decode(plaintext)
}

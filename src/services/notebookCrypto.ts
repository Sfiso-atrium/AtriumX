// Pure Web Crypto helpers for the Notebook feature. Nothing in this file
// ever touches Supabase or the network - it only turns a passcode plus
// plaintext into ciphertext, and back. Keeping this isolated from
// notebook.ts (which does the Supabase calls) makes the boundary
// auditable: if a note's content is encrypted before it leaves the
// device, the proof of that lives entirely in this one file.

const PBKDF2_ITERATIONS = 250_000

// Fixed string encrypted once at setup and re-checked on every unlock -
// the only way to tell "wrong passcode" apart from "right passcode, zero
// notes yet" before trusting the derived key against real data.
const CHECK_VALUE = 'atriumx-notebook-v1'

function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function b64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

export function generateSaltB64(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return bufToB64(salt.buffer)
}

// Turns a passcode + salt into an AES-GCM key. Same passcode + same salt
// always reproduces the same key, which is what lets any device unlock
// the same notebook - nothing about the key itself is ever stored or
// transmitted anywhere.
export async function deriveNotebookKey(passcode: string, saltB64: string): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(passcode), 'PBKDF2', false, ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: b64ToBuf(saltB64), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptText(key: CryptoKey, plaintext: string): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  return { ciphertext: bufToB64(ciphertext), iv: bufToB64(iv.buffer) }
}

export async function decryptText(key: CryptoKey, ciphertextB64: string, ivB64: string): Promise<string> {
  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBuf(ivB64) }, key, b64ToBuf(ciphertextB64)
  )
  return new TextDecoder().decode(plainBuf)
}

export async function encryptBytes(key: CryptoKey, data: ArrayBuffer): Promise<{ ciphertext: ArrayBuffer; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data)
  return { ciphertext, iv: bufToB64(iv.buffer) }
}

export async function decryptBytes(key: CryptoKey, ciphertext: ArrayBuffer, ivB64: string): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64ToBuf(ivB64) }, key, ciphertext)
}

// Setup: encrypt the fixed check value with a brand-new key.
export async function makeCheckValue(key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  return encryptText(key, CHECK_VALUE)
}

// Unlock: does this key correctly decrypt back to the fixed check value?
// Returns false rather than throwing - a wrong passcode is an expected,
// ordinary outcome here, not an error condition.
export async function verifyCheckValue(key: CryptoKey, ciphertextB64: string, ivB64: string): Promise<boolean> {
  try {
    const plain = await decryptText(key, ciphertextB64, ivB64)
    return plain === CHECK_VALUE
  } catch {
    return false
  }
}

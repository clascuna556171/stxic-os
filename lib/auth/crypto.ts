/**
 * Stxic client-side crypto (WebCrypto only).
 *
 * Threat model: data is encrypted at rest with a random Data Encryption Key
 * (DEK). The DEK is wrapped (encrypted) by key-encryption keys (KEKs) derived
 * via PBKDF2 from the master password AND from the PIN, so the PIN alone can
 * unlock after login, while the master password is the recovery path. The DEK
 * is never stored raw. Nothing sensitive is stored in localStorage.
 *
 * Requires a secure context (HTTPS or localhost) for `crypto.subtle`.
 * See docs/AGENT_AUTH_DB.md.
 */

const AES_GCM = "AES-GCM" as const;
const PBKDF2 = "PBKDF2" as const;

/** PBKDF2 iterations. ~210k = OWASP-class, tuned for low-mid hardware. */
export const PBKDF2_ITERATIONS = 210_000;

const enc = new TextEncoder();
const dec = new TextDecoder();

export function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time comparison to avoid leaking secret equality timing. */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function generateSalt(bytes = 16): string {
  return toBase64(crypto.getRandomValues(new Uint8Array(bytes)));
}

/**
 * TS-safe cast for WebCrypto calls. Newer TS types `Uint8Array` as
 * `Uint8Array<ArrayBufferLike>`, which `BufferSource` rejects even though the
 * runtime bytes are identical.
 */
function asBufferSource(input: Uint8Array): BufferSource {
  return input as unknown as BufferSource;
}

/**
 * Derive an AES-GCM CryptoKey from a secret (master password or PIN) + salt.
 * The key is non-extractable: it lives in memory only.
 */
export async function deriveKey(
  secret: string,
  salt: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    asBufferSource(enc.encode(secret)),
    PBKDF2,
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: PBKDF2,
      salt: asBufferSource(fromBase64(salt)),
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: AES_GCM, length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/** One-time hash of a secret (for PIN / master-password verification). */
export async function hashSecret(
  secret: string,
  salt: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    asBufferSource(enc.encode(secret)),
    PBKDF2,
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: PBKDF2,
      salt: asBufferSource(fromBase64(salt)),
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256,
  );
  return toHex(new Uint8Array(bits));
}

/** Generate a fresh, extractable AES-GCM DEK for wrapping data. */
export async function generateDek(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: AES_GCM, length: 256 }, true, ["encrypt", "decrypt"]);
}

export async function exportDek(dek: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", dek);
  return toBase64(new Uint8Array(raw));
}

export async function importDek(rawB64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", asBufferSource(fromBase64(rawB64)), AES_GCM, true, [
    "encrypt",
    "decrypt",
  ]);
}

/**
 * Encrypt a string with an AES-GCM key.
 * Returns `${ivBase64}:${ciphertextBase64}` (auth tag included in ciphertext).
 */
export async function encryptString(key: CryptoKey, plaintext: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: AES_GCM, iv: asBufferSource(iv) },
    key,
    asBufferSource(enc.encode(plaintext)),
  );
  return `${toBase64(iv)}:${toBase64(new Uint8Array(ciphertext))}`;
}

export async function decryptString(key: CryptoKey, packed: string): Promise<string> {
  const [ivB64, cipherB64] = packed.split(":");
  if (!ivB64 || !cipherB64) throw new Error("Invalid encrypted payload");
  const plaintext = await crypto.subtle.decrypt(
    { name: AES_GCM, iv: asBufferSource(fromBase64(ivB64)) },
    key,
    asBufferSource(fromBase64(cipherB64)),
  );
  return dec.decode(plaintext);
}

/** Wrap a raw DEK (base64) under a KEK derived from a secret. */
export async function wrapDek(
  secret: string,
  salt: string,
  dekRawB64: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<string> {
  const kek = await deriveKey(secret, salt, iterations);
  return encryptString(kek, dekRawB64);
}

/** Unwrap a DEK (returns raw base64) using a secret + salt. */
export async function unwrapDek(
  secret: string,
  salt: string,
  wrapped: string,
  iterations = PBKDF2_ITERATIONS,
): Promise<string> {
  const kek = await deriveKey(secret, salt, iterations);
  return decryptString(kek, wrapped);
}

/** True when `wrapped` is a well-formed `${iv}:${ciphertext}` payload. */
export function isWrappedDek(wrapped: string): boolean {
  const parts = wrapped.split(":");
  return parts.length === 2 && parts[0]!.length > 0 && parts[1]!.length > 0;
}

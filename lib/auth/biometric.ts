/**
 * Stxic biometric unlock — WebAuthn PRF extension.
 *
 * The user registers a platform authenticator (fingerprint / face / Windows
 * Hello). WebAuthn's PRF extension deterministically derives a 32-byte secret
 * from that credential + a salt on every `get()` — never extractable, never
 * stored server-side. We wrap the session DEK under an AES-GCM KEK derived
 * from that PRF output, so biometric unlock recovers the DEK without the PIN
 * or master password.
 *
 * Requires a secure context (https / localhost). Fall back to PIN when the
 * PRF extension or a platform authenticator is unavailable (Safari, older
 * Chrome). See docs/AGENT_AUTH_DB.md.
 */

"use client";

import { decryptString, encryptString } from "@/lib/auth/crypto";
import type { BiometricConfig } from "@/types";

/** True when the browser has a usable platform authenticator. */
export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!window.navigator.credentials || typeof window.PublicKeyCredential === "undefined") {
    return false;
  }
  try {
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function rpId(): string {
  return window.location.hostname;
}

/**
 * TS-safe cast for WebAuthn calls — same reasoning as `crypto.ts`.
 * Newer TS types `Uint8Array` as `Uint8Array<ArrayBufferLike>`, which
 * `BufferSource` rejects even though the runtime bytes are identical.
 */
function asBufferSource(input: Uint8Array): BufferSource {
  return input as unknown as BufferSource;
}

function randomBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

/** Derive a non-extractable AES-GCM KEK from the raw PRF secret. */
async function prfSecretToKek(secret: ArrayBuffer): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", secret, "AES-GCM", false, ["encrypt", "decrypt"]);
}

/**
 * Register biometric unlock for the current DEK.
 *
 * Flow: create a credential with the PRF extension, then perform one `get()`
 * with the same salt to receive the derived PRF secret, wrap the DEK under it.
 * Returns the config to persist (credentialId + salt are public).
 */
export async function registerBiometricUnlock(dekRawB64: string): Promise<BiometricConfig> {
  if (!(await isBiometricAvailable())) {
    throw new Error("Biometric unlock isn't available on this device/browser.");
  }

  const salt = randomBytes(32);

  const created = (await navigator.credentials.create({
    publicKey: {
      challenge: asBufferSource(randomBytes(32)),
      rp: { id: rpId(), name: "Stxic" },
      user: {
        id: asBufferSource(randomBytes(16)),
        name: "Stxic user",
        displayName: "Stxic",
      },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
      },
      timeout: 60_000,
      extensions: { prf: { eval: { first: asBufferSource(salt) } } },
    },
  })) as PublicKeyCredential;

  const prfEnabled = (
    created.getClientExtensionResults() as { prf?: { enabled?: boolean } }
  ).prf?.enabled;
  if (!prfEnabled) {
    throw new Error("This authenticator doesn't support the PRF extension needed for biometric unlock.");
  }

  const authenticated = (await navigator.credentials.get({
    publicKey: {
      challenge: asBufferSource(randomBytes(32)),
      rpId: rpId(),
      allowCredentials: [{ type: "public-key", id: created.rawId }],
      userVerification: "required",
      timeout: 60_000,
      extensions: { prf: { eval: { first: asBufferSource(salt) } } },
    },
  })) as PublicKeyCredential;

  const first = (
    authenticated.getClientExtensionResults() as { prf?: { results?: { first?: ArrayBuffer } } }
  ).prf?.results?.first;
  if (!first) {
    throw new Error("Couldn't derive the biometric key. Try again.");
  }

  const kek = await prfSecretToKek(first);
  const wrapped = await encryptString(kek, dekRawB64);

  return {
    credentialId: btoa(String.fromCharCode(...new Uint8Array(created.rawId))),
    salt: btoa(String.fromCharCode(...salt)),
    wrappedDekBiometric: wrapped,
  };
}

/**
 * Unlock: authenticate with the stored credential + salt, derive the PRF
 * secret, unwrap the DEK, and return the raw base64 DEK.
 */
export async function unlockWithBiometric(cfg: BiometricConfig): Promise<string> {
  const credentialId = Uint8Array.from(atob(cfg.credentialId), (c) => c.charCodeAt(0));
  const salt = Uint8Array.from(atob(cfg.salt), (c) => c.charCodeAt(0));

  const authenticated = (await navigator.credentials.get({
    publicKey: {
      challenge: asBufferSource(randomBytes(32)),
      rpId: rpId(),
      allowCredentials: [{ type: "public-key", id: asBufferSource(credentialId) }],
      userVerification: "required",
      timeout: 60_000,
      extensions: { prf: { eval: { first: asBufferSource(salt) } } },
    },
  })) as PublicKeyCredential;

  const first = (
    authenticated.getClientExtensionResults() as { prf?: { results?: { first?: ArrayBuffer } } }
  ).prf?.results?.first;
  if (!first) {
    throw new Error("Couldn't derive the biometric key.");
  }

  const kek = await prfSecretToKek(first);
  return decryptString(kek, cfg.wrappedDekBiometric);
}

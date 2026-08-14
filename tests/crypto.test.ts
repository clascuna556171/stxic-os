import { describe, it, expect } from "vitest";
import {
  generateSalt,
  deriveKey,
  generateDek,
  exportDek,
  importDek,
  encryptString,
  decryptString,
  hashSecret,
  wrapDek,
  unwrapDek,
  constantTimeEqual,
  isWrappedDek,
} from "@/lib/auth/crypto";

describe("crypto round-trip (AES-GCM + PBKDF2)", () => {
  it("encrypts and decrypts a string", async () => {
    const key = await deriveKey("correct horse battery staple", generateSalt());
    const packed = await encryptString(key, "vault-secret: hunter2");
    expect(isWrappedDek(packed)).toBe(true);
    expect(await decryptString(key, packed)).toBe("vault-secret: hunter2");
  });

  it("fails to decrypt with the wrong key", async () => {
    const key = await deriveKey("password-A", generateSalt());
    const other = await deriveKey("password-B", generateSalt());
    const packed = await encryptString(key, "top-secret");
    await expect(decryptString(other, packed)).rejects.toThrow();
  });

  it("hashSecret is deterministic and verifiable", async () => {
    const salt = generateSalt();
    const a = await hashSecret("1234", salt);
    const b = await hashSecret("1234", salt);
    expect(a).toBe(b);
    expect(await hashSecret("9999", salt)).not.toBe(a);
    expect(constantTimeEqual(a, b)).toBe(true);
    expect(constantTimeEqual(a, await hashSecret("9999", salt))).toBe(false);
  });

  it("wraps and unwraps a DEK under master password and PIN", async () => {
    const dek = await generateDek();
    const dekRaw = await exportDek(dek);

    const masterSalt = generateSalt();
    const pinSalt = generateSalt();
    const wrappedMaster = await wrapDek("my-master-password", masterSalt, dekRaw);
    const wrappedPin = await wrapDek("1234", pinSalt, dekRaw);

    expect(await unwrapDek("my-master-password", masterSalt, wrappedMaster)).toBe(dekRaw);
    expect(await unwrapDek("1234", pinSalt, wrappedPin)).toBe(dekRaw);
    await expect(unwrapDek("wrong", pinSalt, wrappedPin)).rejects.toThrow();
  });

  it("imports an exported DEK and re-uses it", async () => {
    const dek = await generateDek();
    const raw = await exportDek(dek);
    const reimported = await importDek(raw);
    const packed = await encryptString(reimported, "persisted");
    expect(await decryptString(dek, packed)).toBe("persisted");
  });
});

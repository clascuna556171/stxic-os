import { describe, it, expect, beforeEach } from "vitest";
import { passwordStrength } from "@/lib/strength";
import { friendlyAuthError } from "@/lib/auth/errors";
import {
  constantTimeEqual,
  exportDek,
  generateDek,
  generateSalt,
  hashSecret,
  importDek,
  unwrapDek,
  wrapDek,
} from "@/lib/auth/crypto";
import { disableLocalDemo, enableLocalDemo, isLocalDemoActive } from "@/lib/demo/local";

describe("auth validation logic", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      window.localStorage.clear();
    }
  });

  it("evaluates password strength accurately for user registration", () => {
    expect(passwordStrength("").score).toBe(0);
    expect(passwordStrength("short").score).toBe(0);
    expect(passwordStrength("password123").score).toBeGreaterThanOrEqual(1);
    expect(passwordStrength("CorrectHorseBatteryStaple1!").score).toBe(4);
  });

  it("handles empty or malformed errors cleanly without crashing", () => {
    expect(friendlyAuthError({})).toContain("Something went wrong");
    expect(friendlyAuthError(new Error("auth/too-many-requests"))).toContain("multiple failed login attempts");
    expect(friendlyAuthError({ code: "auth/network-request-failed" })).toContain("Network error");
    expect(friendlyAuthError({ code: "auth/user-not-found" })).toContain("No account found");
  });

  it("sanitizes email strings for lowercase and trimming", () => {
    const rawEmail = "  User@Example.COM  ";
    const sanitized = rawEmail.trim().toLowerCase();
    expect(sanitized).toBe("user@example.com");
  });

  it("clears local demo flag before real account sign-in", () => {
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, "window", {
      value: {
        localStorage: {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => store.set(k, v),
          removeItem: (k: string) => store.delete(k),
          clear: () => store.clear(),
        },
      },
      configurable: true,
    });
    enableLocalDemo();
    expect(isLocalDemoActive()).toBe(true);
    disableLocalDemo();
    expect(isLocalDemoActive()).toBe(false);
  });

  it("round-trips PIN wrap/unwrap and constant-time hash verification for login unlock", async () => {
    const pin = "4829";
    const pinSalt = generateSalt();
    const pinHash = await hashSecret(pin, pinSalt);
    const dek = await generateDek();
    const rawDek = await exportDek(dek);
    const wrappedDekPin = await wrapDek(pin, pinSalt, rawDek);

    const checkHash = await hashSecret(pin, pinSalt);
    expect(constantTimeEqual(checkHash, pinHash)).toBe(true);

    const unwrappedRaw = await unwrapDek(pin, pinSalt, wrappedDekPin);
    expect(unwrappedRaw).toBe(rawDek);
    const imported = await importDek(unwrappedRaw);
    expect(imported.type).toBe("secret");
  });
});

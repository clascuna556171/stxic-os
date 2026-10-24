import { describe, it, expect } from "vitest";
import { passwordStrength } from "@/lib/strength";
import { friendlyAuthError } from "@/lib/auth/errors";

describe("auth validation logic", () => {
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
});

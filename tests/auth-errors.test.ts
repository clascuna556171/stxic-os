import { describe, it, expect } from "vitest";
import { friendlyAuthError } from "@/lib/auth/errors";

describe("friendlyAuthError", () => {
  it("translates invalid credentials and wrong password", () => {
    expect(friendlyAuthError({ code: "auth/invalid-credential" })).toContain("Incorrect email or password");
    expect(friendlyAuthError({ code: "auth/wrong-password" })).toContain("Incorrect email or password");
    expect(friendlyAuthError({ code: "auth/invalid-login-credentials" })).toContain("Incorrect email or password");
    expect(friendlyAuthError(new Error("Firebase: Error (auth/invalid-credential)."))).toContain("Incorrect email or password");
  });

  it("translates user-not-found", () => {
    expect(friendlyAuthError({ code: "auth/user-not-found" })).toContain("No account found");
  });

  it("translates email-already-in-use", () => {
    expect(friendlyAuthError({ code: "auth/email-already-in-use" })).toContain("An account with this email already exists");
  });

  it("translates invalid-email", () => {
    expect(friendlyAuthError({ code: "auth/invalid-email" })).toContain("valid email address");
  });

  it("translates weak-password", () => {
    expect(friendlyAuthError({ code: "auth/weak-password" })).toContain("Password is too weak");
  });

  it("translates too-many-requests", () => {
    expect(friendlyAuthError({ code: "auth/too-many-requests" })).toContain("multiple failed login attempts");
  });

  it("translates network-request-failed", () => {
    expect(friendlyAuthError({ code: "auth/network-request-failed" })).toContain("Network error");
  });

  it("translates password reset action codes", () => {
    expect(friendlyAuthError({ code: "auth/expired-action-code" })).toContain("reset link has expired");
    expect(friendlyAuthError({ code: "auth/invalid-action-code" })).toContain("reset link is invalid");
  });

  it("handles unknown or empty errors safely", () => {
    expect(friendlyAuthError(null)).toBe("An unexpected error occurred. Please try again.");
    expect(friendlyAuthError(undefined)).toBe("An unexpected error occurred. Please try again.");
    expect(friendlyAuthError({ code: "auth/unknown-error" })).toContain("Something went wrong");
  });
});

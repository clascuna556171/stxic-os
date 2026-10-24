"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, RefreshCw } from "lucide-react";
import { getAuthClient, getDb } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/brand/brand-mark";
import { friendlyAuthError } from "@/lib/auth/errors";
import { passwordStrength } from "@/lib/strength";
import { cn } from "@/lib/utils/cn";

type AuthMode = "signin" | "signup" | "forgot";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mode, setMode] = useState<AuthMode>("signin");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { user, sessionReady, error: authError, enableLocalDemo } = useAuth();
  const router = useRouter();

  // Watchdog timer to ensure busy state never permanently freezes the UI
  useEffect(() => {
    if (busy) {
      watchdogRef.current = setTimeout(() => {
        setBusy(false);
        setError("Operation took longer than expected. Please check your network connection and retry.");
      }, 16_000);
    } else if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
    return () => {
      if (watchdogRef.current) {
        clearTimeout(watchdogRef.current);
        watchdogRef.current = null;
      }
    };
  }, [busy]);

  useEffect(() => {
    if (user && sessionReady) {
      router.replace(user.isAnonymous ? "/dashboard" : "/pin");
    }
  }, [user, sessionReady, router]);

  const waiting = busy && !authError;
  const strength = passwordStrength(password);

  function switchMode(newMode: AuthMode) {
    setMode(newMode);
    setError("");
    setSuccess("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (mode === "forgot") {
      setBusy(true);
      try {
        const auth = getAuthClient();
        await sendPasswordResetEmail(auth, cleanEmail);
        setSuccess(
          "Password reset email sent! Please check your inbox (and spam folder) for instructions to reset your password.",
        );
      } catch (err) {
        setError(friendlyAuthError(err));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === "signup") {
      if (!password) {
        setError("Please enter a password.");
        return;
      }
      if (password.length < 6) {
        setError("Password is too short. Please use at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please verify your password confirmation.");
        return;
      }

      setBusy(true);
      try {
        const auth = getAuthClient();
        const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        // Pre-provision user doc to eliminate profile race conditions during onboarding
        if (userCred.user) {
          try {
            await setDoc(
              doc(getDb(), "users", userCred.user.uid),
              {
                uid: userCred.user.uid,
                email: cleanEmail,
                createdAt: Date.now(),
                plan: "free",
              },
              { merge: true },
            );
          } catch {
            // Non-fatal client fallback handled gracefully by /pin and server actions
          }
        }
      } catch (err) {
        setError(friendlyAuthError(err));
        setBusy(false);
      }
      return;
    }

    // mode === "signin"
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setBusy(true);
    try {
      const auth = getAuthClient();
      await signInWithEmailAndPassword(auth, cleanEmail, password);
    } catch (err) {
      setError(friendlyAuthError(err));
      setBusy(false);
    }
  }

  async function tryDemo() {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await signInAnonymously(getAuthClient());
    } catch (err) {
      console.warn("Firebase anonymous auth failed, activating local demo sandbox:", err);
      try {
        await enableLocalDemo();
        router.replace("/dashboard");
      } catch (fallbackErr) {
        setError(friendlyAuthError(fallbackErr));
        setBusy(false);
      }
    }
  }

  if (user && !sessionReady) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <BrandMark size={32} />
          <p className="text-muted flex items-center gap-2 text-sm">
            <RefreshCw className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
            Preparing your secure session…
          </p>
        </div>
      </main>
    );
  }

  if (user && sessionReady) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <BrandMark size={32} />
          <p className="text-muted flex items-center gap-2 text-sm">
            <RefreshCw className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
            Redirecting to your vault…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-8">
      <div className="flex items-center gap-2.5">
        <BrandMark size={32} />
        <span className="text-foreground text-xl font-semibold tracking-tight">Stxic</span>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            {mode === "signin"
              ? "Welcome back"
              : mode === "signup"
                ? "Create your account"
                : "Reset password"}
          </CardTitle>
          <CardDescription>
            {mode === "signin"
              ? "Sign in to access your encrypted vault."
              : mode === "signup"
                ? "Free forever. Client-side encrypted & private."
                : "Enter your email to receive a password reset link."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                placeholder="you@example.com"
                disabled={waiting}
              />
            </div>

            {mode !== "forgot" ? (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "signin" ? (
                    <button
                      type="button"
                      className="text-muted hover:text-accent text-xs transition-colors"
                      onClick={() => switchMode("forgot")}
                    >
                      Forgot password?
                    </button>
                  ) : null}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="••••••••"
                    disabled={waiting}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="text-muted hover:text-foreground absolute right-2.5 top-1/2 -translate-y-1/2 p-1 transition-colors"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>

                {mode === "signup" && password ? (
                  <div className="mt-1 flex items-center justify-between text-xs">
                    <span className="text-muted">
                      Strength:{" "}
                      <span className="text-foreground font-medium">{strength.label}</span>
                    </span>
                    <span className="inline-flex gap-1">
                      {[1, 2, 3, 4].map((step) => (
                        <span
                          key={step}
                          className={cn(
                            "h-1 w-3.5 rounded-full transition-colors",
                            step <= strength.score
                              ? strength.score <= 1
                                ? "bg-danger"
                                : strength.score === 2
                                  ? "bg-amber-500"
                                  : "bg-accent"
                              : "bg-surface-2",
                          )}
                        />
                      ))}
                    </span>
                  </div>
                ) : null}
              </div>
            ) : null}

            {mode === "signup" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="••••••••"
                    disabled={waiting}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    className="text-muted hover:text-foreground absolute right-2.5 top-1/2 -translate-y-1/2 p-1 transition-colors"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password ? (
                  <p className="text-danger text-xs">Passwords do not match.</p>
                ) : null}
              </div>
            ) : null}

            {success ? (
              <div
                role="status"
                className="border-accent/40 bg-accent/10 text-foreground flex items-start gap-2.5 rounded-lg border p-3 text-xs leading-relaxed"
              >
                <CheckCircle2 className="text-accent mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{success}</span>
              </div>
            ) : null}

            {error || authError ? (
              <div
                role="alert"
                className="border-danger/30 bg-danger/10 text-danger flex items-start gap-2.5 rounded-lg border p-3 text-xs leading-relaxed"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{error || authError}</span>
              </div>
            ) : null}

            <Button type="submit" variant="primary" className="w-full mt-1" disabled={waiting}>
              {waiting ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="size-4 animate-spin" aria-hidden />
                  {mode === "signin"
                    ? "Signing in…"
                    : mode === "signup"
                      ? "Creating account…"
                      : "Sending link…"}
                </span>
              ) : mode === "signin" ? (
                "Sign in"
              ) : mode === "signup" ? (
                "Create account"
              ) : (
                "Send reset link"
              )}
            </Button>
          </form>

          {mode === "forgot" ? (
            <div className="mt-4 text-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-muted hover:text-foreground"
                onClick={() => switchMode("signin")}
                disabled={waiting}
              >
                <ArrowLeft className="mr-1.5 size-3.5" />
                Back to sign in
              </Button>
            </div>
          ) : (
            <p className="text-muted mt-4 text-center text-sm">
              {mode === "signin" ? "New here? " : "Already have an account? "}
              <button
                type="button"
                className="text-accent font-medium hover:underline focus:outline-none"
                onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
                disabled={waiting}
              >
                {mode === "signin" ? "Create an account" : "Sign in"}
              </button>
            </p>
          )}

          {mode !== "forgot" ? (
            <div className="border-border mt-4 border-t pt-4">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => void tryDemo()}
                disabled={waiting}
              >
                Try the demo
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <p className="text-muted text-xs">Demo data is sandboxed — no account required.</p>
    </main>
  );
}

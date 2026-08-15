"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  signInAnonymously,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { RefreshCw } from "lucide-react";
import { getAuthClient } from "@/lib/firebase/client";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/brand/brand-mark";

function friendlyAuthError(message: string): string {
  if (message.includes("invalid-credential") || message.includes("wrong-password")) {
    return "Incorrect email or password.";
  }
  if (message.includes("user-not-found")) return "No account found with that email.";
  if (message.includes("email-already-in-use")) return "That email is already registered.";
  if (message.includes("invalid-email")) return "Enter a valid email address.";
  if (message.includes("weak-password")) return "Password is too weak (min 6 characters).";
  return "Something went wrong. Try again.";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { user, sessionReady, error: authError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && sessionReady && !authError) {
      router.replace(user.isAnonymous ? "/dashboard" : "/pin");
    }
  }, [user, sessionReady, router, authError]);

  const waiting = busy && !authError;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const auth = getAuthClient();
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err) {
      setError(friendlyAuthError((err as Error).message));
      setBusy(false);
    }
  }

  async function tryDemo() {
    setBusy(true);
    setError("");
    try {
      await signInAnonymously(getAuthClient());
    } catch (err) {
      setError(friendlyAuthError((err as Error).message));
      setBusy(false);
    }
  }

  if (user && !sessionReady) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-muted flex items-center gap-2 text-sm">
          <RefreshCw className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
          Preparing your session…
        </p>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
      <div className="flex items-center gap-2.5">
        <BrandMark size={30} />
        <span className="text-foreground text-lg font-semibold tracking-tight">Stxic</span>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{mode === "signin" ? "Welcome back" : "Create your account"}</CardTitle>
          <CardDescription>
            {mode === "signin"
              ? "Sign in to continue to your vault."
              : "Free forever. No payment required."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error || authError ? (
              <p role="alert" className="text-danger text-sm">
                {error || authError}
              </p>
            ) : null}

            <Button type="submit" variant="primary" className="w-full" disabled={waiting}>
              {waiting ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="text-muted mt-4 text-center text-sm">
            {mode === "signin" ? "New here? " : "Already have an account? "}
            <button
              type="button"
              className="text-accent font-medium hover:underline"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setError("");
              }}
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>

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
        </CardContent>
      </Card>

      <p className="text-muted text-xs">Demo data is not real — no account required.</p>
    </main>
  );
}

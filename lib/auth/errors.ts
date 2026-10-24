/**
 * Stxic authentication error mapping.
 * Translates Firebase Auth and system error codes into human-friendly explanations.
 */

export function friendlyAuthError(err: unknown): string {
  if (!err) return "An unexpected error occurred. Please try again.";

  let code = "";
  let message = "";

  if (typeof err === "string") {
    message = err;
  } else if (typeof err === "object" && err !== null) {
    const errorObj = err as { code?: unknown; message?: unknown };
    if (typeof errorObj.code === "string") code = errorObj.code.toLowerCase();
    if (typeof errorObj.message === "string") message = errorObj.message.toLowerCase();
  }

  const combined = `${code} ${message}`;

  if (
    combined.includes("invalid-credential") ||
    combined.includes("wrong-password") ||
    combined.includes("invalid-login-credentials")
  ) {
    return "Incorrect email or password. Please double check and try again.";
  }

  if (combined.includes("user-not-found")) {
    return "No account found with this email. Please check the spelling or sign up.";
  }

  if (combined.includes("email-already-in-use")) {
    return "An account with this email already exists. Try signing in or resetting your password.";
  }

  if (combined.includes("invalid-email")) {
    return "Please enter a valid email address.";
  }

  if (combined.includes("weak-password")) {
    return "Password is too weak. Please use at least 6 characters with letters and numbers.";
  }

  if (combined.includes("too-many-requests")) {
    return "Access temporarily locked due to multiple failed login attempts. Please reset your password or wait a few minutes.";
  }

  if (combined.includes("user-disabled")) {
    return "This user account has been disabled. Please contact support.";
  }

  if (combined.includes("operation-not-allowed")) {
    return "Email/password authentication is not enabled in Firebase console.";
  }

  if (combined.includes("admin-restricted-operation")) {
    return "Anonymous sign-in is disabled in Firebase console.";
  }

  if (combined.includes("network-request-failed")) {
    return "Network error. Please check your internet connection.";
  }

  if (combined.includes("popup-closed-by-user")) {
    return "Sign-in was cancelled.";
  }

  if (combined.includes("expired-action-code")) {
    return "This password reset link has expired. Please request a new one.";
  }

  if (combined.includes("invalid-action-code")) {
    return "This password reset link is invalid or has already been used.";
  }

  if (combined.includes("timeout")) {
    return "The request timed out. Please check your network and try again.";
  }

  // If there's a clean custom message that isn't Firebase boilerplate, surface it
  if (typeof err === "object" && err !== null && "message" in err) {
    const rawMsg = String((err as { message: unknown }).message);
    if (rawMsg && !rawMsg.includes("Firebase:") && !rawMsg.includes("auth/")) {
      return rawMsg;
    }
  }

  return "Something went wrong during authentication. Please try again.";
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next 16 login guard (`middleware` was renamed `proxy` — see
 * docs/AGENT_API_ORCHESTRATION.md). Redirects unsigned visitors to /login.
 *
 * IMPORTANT: this is an OPTIMISTIC check only — it verifies the session
 * cookie's presence, not its signature. Proxy runs on the Edge runtime,
 * which cannot load `firebase-admin` (the `jose` ESM dependency fails on
 * `require()`). Real enforcement lives in the Firestore rules (own-uid only)
 * and inside route handlers / server actions, which run on Node.
 */

const SESSION_COOKIE = "stxic_session";
const PUBLIC_PATHS = new Set(["/login", "/demo", "/_not-found"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith("/p/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|sw\\.js|robots\\.txt|sitemap\\.xml|icon-.*\\.png).*)",
  ],
};

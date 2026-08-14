import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

/**
 * Next 16 login guard (`middleware` was renamed `proxy` — see
 * docs/AGENT_API_ORCHESTRATION.md). Redirects unsigned visitors to /login.
 * This is a UX convenience: real enforcement lives in the Firestore rules
 * (own-uid only) and inside route handlers / server actions.
 */

const PUBLIC_PATHS = new Set(["/login", "/demo", "/_not-found"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token && (await verifySessionToken(token))) {
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

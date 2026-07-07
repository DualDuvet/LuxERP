import { NextResponse, type NextRequest } from "next/server";
import { validateSecurityEnv } from "@/lib/security-env";
import { isValidSessionToken } from "@/lib/session-token";

const sessionCookieName = "luxerp_session";

const publicPrefixes = [
  "/login",
  "/api/auth",
  "/_next",
  "/favicon.ico",
  "/logo.svg",
  "/sw.js"
];

function isPublicPath(pathname: string) {
  return publicPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function middleware(request: NextRequest) {
  validateSecurityEnv();
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(sessionCookieName)?.value;

  if (!(await isValidSessionToken(sessionToken))) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)", "/api/:path*"]
};

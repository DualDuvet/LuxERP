import { NextResponse } from "next/server";
import { authenticateByPin, setSessionCookie } from "@/lib/auth";
import {
  checkLoginRateLimit,
  clearLoginFailures,
  loginRateLimitKey,
  recordLoginFailure
} from "@/lib/login-rate-limit";
import { sameHostRedirectUrl } from "@/lib/request-redirect";
import { safeNextPath } from "@/lib/safe-next-path";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimitKey = loginRateLimitKey(request);
  const rateLimit = checkLoginRateLimit(rateLimitKey);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

  const formData = await request.formData();
  const pin = String(formData.get("pin") ?? "");
  const next = safeNextPath(formData.get("next"));
  const user = await authenticateByPin(pin);

  if (!user) {
    recordLoginFailure(rateLimitKey);
    const url = sameHostRedirectUrl(request, "/login");
    url.searchParams.set("error", "1");
    url.searchParams.set("next", next);
    return NextResponse.redirect(url, { status: 303 });
  }

  clearLoginFailures(rateLimitKey);
  const response = NextResponse.redirect(sameHostRedirectUrl(request, next), { status: 303 });
  setSessionCookie(response, user, request);
  return response;
}

import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { sameHostRedirectUrl } from "@/lib/request-redirect";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const response = NextResponse.redirect(sameHostRedirectUrl(request, "/login"), { status: 303 });
  clearSessionCookie(response);
  return response;
}

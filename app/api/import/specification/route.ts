import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth";

export async function POST() {
  const auth = await requireApiRole(["admin", "manager"]);

  if (auth.response) {
    return auth.response;
  }

  return NextResponse.json(
    {
      error: "Use /api/import/specification/preview to parse a file, then /api/import/specification/confirm to save the preview."
    },
    { status: 400 }
  );
}

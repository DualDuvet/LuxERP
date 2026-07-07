import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { listDictionaries } from "@/lib/dictionary-store";

export async function GET() {
  const auth = await requireApiUser();

  if (auth.response) {
    return auth.response;
  }

  return NextResponse.json({ data: await listDictionaries() });
}

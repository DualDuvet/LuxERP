import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth";
import { assertManagedDictionaryType, createDictionaryItem } from "@/lib/dictionary-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ type: string }> }) {
  const auth = await requireApiRole(["admin"]);

  if (auth.response) {
    return auth.response;
  }

  try {
    const { type } = await params;
    const item = await createDictionaryItem(assertManagedDictionaryType(type), await request.json());
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create dictionary item" },
      { status: 400 }
    );
  }
}

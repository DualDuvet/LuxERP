import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth";
import {
  assertManagedDictionaryType,
  deactivateDictionaryItem,
  updateDictionaryItem
} from "@/lib/dictionary-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const auth = await requireApiRole(["admin"]);

  if (auth.response) {
    return auth.response;
  }

  try {
    const { type, id } = await params;
    const item = await updateDictionaryItem(assertManagedDictionaryType(type), id, await request.json());

    if (!item) {
      return NextResponse.json({ error: "Dictionary item not found" }, { status: 404 });
    }

    return NextResponse.json({ data: item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update dictionary item" },
      { status: 400 }
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const auth = await requireApiRole(["admin"]);

  if (auth.response) {
    return auth.response;
  }

  try {
    const { type, id } = await params;
    const item = await deactivateDictionaryItem(assertManagedDictionaryType(type), id);

    if (!item) {
      return NextResponse.json({ error: "Dictionary item not found" }, { status: 404 });
    }

    return NextResponse.json({ data: item });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to deactivate dictionary item" },
      { status: 400 }
    );
  }
}

import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getOrderById } from "@/lib/order-store";
import { renderPrintHtml } from "@/lib/order-print-html";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();

  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return new NextResponse(await renderPrintHtml(order), {
    headers: {
      "Content-Type": "text/html; charset=utf-8"
    }
  });
}

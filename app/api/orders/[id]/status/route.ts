import { NextResponse } from "next/server";
import { z } from "zod";
import { readJsonBody } from "@/lib/api-json";
import { canManageProduction, requireApiUser } from "@/lib/auth";
import { getOrderById, updateOrder } from "@/lib/order-store";
import { applyQrStatusTransition, qrStatusChoices, type QrStatusChoice } from "@/lib/order-status-flow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const emptyStringToUndefined = (value: unknown) => (value === "" ? undefined : value);

const bodySchema = z.object({
  status: z.enum(qrStatusChoices),
  comment: z.preprocess(emptyStringToUndefined, z.string().trim().max(300).optional()),
  productionStartedAt: z.preprocess(emptyStringToUndefined, z.string().trim().optional()),
  readyAt: z.preprocess(emptyStringToUndefined, z.string().trim().optional()),
  shippedAt: z.preprocess(emptyStringToUndefined, z.string().trim().optional())
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();

  if (auth.response) {
    return auth.response;
  }

  if (!canManageProduction(auth.user.role) && !["admin", "manager"].includes(auth.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const body = await readJsonBody(request);

  if (!body.ok) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body.data);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;

  try {
    const nextState = applyQrStatusTransition(order, payload.status as QrStatusChoice, {
      changedBy: auth.user.id,
      comment: payload.comment,
      productionStartedAt: payload.productionStartedAt,
      readyAt: payload.readyAt,
      shippedAt: payload.shippedAt
    });

    const updatedOrder = await updateOrder(order.id, nextState);
    return NextResponse.json({ data: updatedOrder });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_QR_STATUS_TRANSITION") {
      return NextResponse.json({ error: "Status transition is not allowed" }, { status: 409 });
    }

    throw error;
  }
}

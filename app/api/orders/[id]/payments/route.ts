import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { readJsonBody } from "@/lib/api-json";
import { calculateOrderTotals } from "@/lib/calculations";
import { requireApiRole } from "@/lib/auth";
import { getOrderById, updateOrder } from "@/lib/order-store";
import { paymentTypes } from "@/lib/types";
import type { Order, Payment } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paymentMethods = ["cash", "card", "bank_transfer", "other"] as const;

const emptyStringToUndefined = (value: unknown) => (value === "" || value == null ? undefined : value);
const optionalText = z.preprocess(emptyStringToUndefined, z.string().trim().optional());

const paymentCreateSchema = z.object({
  paymentType: z.enum(paymentTypes),
  amount: z.coerce.number().positive(),
  paymentDate: z.string().trim().min(1),
  paymentMethod: z.enum(paymentMethods).optional(),
  comment: optionalText
});

const paymentDeleteSchema = z.object({
  paymentId: z.string().min(1)
});

function recalculateOrder(order: Order, payments: Payment[]) {
  const totals = calculateOrderTotals(order.lines, payments);

  return updateOrder(order.id, {
    payments,
    totalAreaM2: totals.totalAreaM2,
    subtotalAmount: totals.subtotalAmount,
    discountAmount: totals.discountAmount,
    surchargeAmount: totals.surchargeAmount,
    totalAmount: totals.totalAmount,
    prepaymentAmount: totals.prepaymentAmount,
    balanceAmount: totals.balanceAmount
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole(["admin", "accountant"]);

  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ data: order.payments });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole(["admin", "accountant"]);

  if (auth.response) {
    return auth.response;
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

  const parsed = paymentCreateSchema.safeParse(body.data);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payment payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const payment: Payment = {
    id: `${order.id}-payment-${randomUUID()}`,
    orderId: order.id,
    paymentType: parsed.data.paymentType,
    amount: parsed.data.amount,
    paymentDate: parsed.data.paymentDate,
    paymentMethod: parsed.data.paymentMethod,
    comment: parsed.data.comment
  };
  const updatedOrder = await recalculateOrder(order, [...order.payments, payment]);

  return NextResponse.json({ data: updatedOrder, payment }, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole(["admin", "accountant"]);

  if (auth.response) {
    return auth.response;
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

  const parsed = paymentDeleteSchema.safeParse(body.data);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payment payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const paymentExists = order.payments.some((payment) => payment.id === parsed.data.paymentId);

  if (!paymentExists) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const updatedOrder = await recalculateOrder(
    order,
    order.payments.filter((payment) => payment.id !== parsed.data.paymentId)
  );

  return NextResponse.json({ data: updatedOrder });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateLine, calculateOrderTotals } from "@/lib/calculations";
import { requireApiRole, requireApiUser } from "@/lib/auth";
import { getOrderById, updateOrder } from "@/lib/order-store";
import { specificationLineTypes } from "@/lib/types";
import type { Order, SpecificationLine } from "@/lib/types";

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

  return NextResponse.json({ data: order.lines });
}

const emptyStringToUndefined = (value: unknown) => (value === "" || value == null ? undefined : value);
const optionalNumber = z.preprocess(emptyStringToUndefined, z.coerce.number().nonnegative().optional());
const optionalText = z.preprocess(emptyStringToUndefined, z.string().trim().optional());

const linePatchSchema = z.object({
  lineId: z.string().min(1),
  lineType: z.enum(specificationLineTypes).optional(),
  title: optionalText,
  description: optionalText,
  heightMm: optionalNumber,
  widthMm: optionalNumber,
  quantity: optionalNumber,
  unit: optionalText,
  pricePerM2: optionalNumber,
  unitPrice: optionalNumber,
  isPrinted: z.coerce.boolean().optional()
});

const lineCreateSchema = z.object({
  afterLineId: optionalText,
  parentId: optionalText,
  lineType: z.enum(specificationLineTypes).default("product"),
  title: optionalText,
  description: optionalText,
  heightMm: optionalNumber,
  widthMm: optionalNumber,
  quantity: optionalNumber,
  unit: optionalText,
  pricePerM2: optionalNumber,
  unitPrice: optionalNumber,
  isPrinted: z.coerce.boolean().default(true)
});

const lineDeleteSchema = z.object({
  lineId: z.string().min(1)
});

const calculatedTypes = new Set(["product", "service", "discount", "surcharge", "subtotal", "total"]);

function recalculateOrder(order: Order, lines: SpecificationLine[]) {
  const totals = calculateOrderTotals(lines, order.payments);

  return updateOrder(order.id, {
    lines,
    totalAreaM2: totals.totalAreaM2,
    subtotalAmount: totals.subtotalAmount,
    discountAmount: totals.discountAmount,
    surchargeAmount: totals.surchargeAmount,
    totalAmount: totals.totalAmount,
    prepaymentAmount: totals.prepaymentAmount,
    balanceAmount: totals.balanceAmount
  });
}

function makeLineId(orderId: string) {
  return `${orderId}-line-${Date.now()}`;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole(["admin", "manager"]);

  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const parsed = linePatchSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid line payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { lineId, ...patch } = parsed.data;
  const lineExists = order.lines.some((line) => line.id === lineId);

  if (!lineExists) {
    return NextResponse.json({ error: "Line not found" }, { status: 404 });
  }

  const lines = order.lines.map((line) => {
    if (line.id !== lineId) {
      return line;
    }

    const hasTitlePatch = Object.prototype.hasOwnProperty.call(patch, "title");
    const hasDescriptionPatch = Object.prototype.hasOwnProperty.call(patch, "description");
    const hasUnitPatch = Object.prototype.hasOwnProperty.call(patch, "unit");
    const nextLine = {
      ...line,
      ...patch,
      title: hasTitlePatch ? patch.title : line.title,
      description: hasDescriptionPatch ? patch.description : line.description,
      unit: hasUnitPatch ? patch.unit : line.unit,
      isCalculated: patch.lineType ? calculatedTypes.has(patch.lineType) : line.isCalculated
    };

    return calculateLine(nextLine);
  });
  const updatedOrder = await recalculateOrder(order, lines);

  return NextResponse.json({ data: updatedOrder });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole(["admin", "manager"]);

  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const parsed = lineCreateSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid line payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  const sortedLines = [...order.lines].sort((first, second) => first.sortOrder - second.sortOrder);
  const afterLine = payload.afterLineId
    ? sortedLines.find((line) => line.id === payload.afterLineId)
    : sortedLines.at(-1);
  const sortOrder = (afterLine?.sortOrder ?? 0) + 5;
  const lines = order.lines.map((line) =>
    line.sortOrder >= sortOrder ? { ...line, sortOrder: line.sortOrder + 10 } : line
  );
  const line: SpecificationLine = calculateLine({
    id: makeLineId(order.id),
    orderId: order.id,
    parentId: payload.parentId ?? afterLine?.parentId ?? null,
    lineType: payload.lineType,
    sortOrder,
    title: payload.title,
    description: payload.description,
    heightMm: payload.heightMm,
    widthMm: payload.widthMm,
    quantity: payload.quantity,
    unit: payload.unit,
    pricePerM2: payload.pricePerM2,
    unitPrice: payload.unitPrice,
    isCalculated: calculatedTypes.has(payload.lineType),
    isPrinted: payload.isPrinted
  });
  const updatedOrder = await recalculateOrder(order, [...lines, line]);

  return NextResponse.json({ data: updatedOrder, line }, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole(["admin", "manager"]);

  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const parsed = lineDeleteSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid line payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const line = order.lines.find((item) => item.id === parsed.data.lineId);

  if (!line) {
    return NextResponse.json({ error: "Line not found" }, { status: 404 });
  }

  const lines = order.lines.filter((item) => item.id !== line.id && item.parentId !== line.id);
  const updatedOrder = await recalculateOrder(order, lines);

  return NextResponse.json({ data: updatedOrder });
}

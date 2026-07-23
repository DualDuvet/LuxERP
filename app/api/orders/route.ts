import { NextResponse } from "next/server";
import { z } from "zod";
import { readJsonBody } from "@/lib/api-json";
import { calculateOrderTotals } from "@/lib/calculations";
import { requireApiRole, requireApiUser } from "@/lib/auth";
import { createDictionaryItem, listDictionaries } from "@/lib/dictionary-store";
import { normalizeOrderLines, orderLinesInputSchema } from "@/lib/order-form-payload";
import { listOrders, saveOrder } from "@/lib/order-store";
import { orderStatuses } from "@/lib/types";
import type { Order } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiUser();

  if (auth.response) {
    return auth.response;
  }

  const orders = await listOrders();
  return NextResponse.json({ data: orders });
}

const legalTypes = ["ООО", "ИП", "ч/л", "ЗАО"] as const;
const emptyStringToUndefined = (value: unknown) => (value === "" || value == null ? undefined : value);
const optionalText = z.preprocess(emptyStringToUndefined, z.string().trim().optional());
const optionalNumber = z.preprocess(emptyStringToUndefined, z.coerce.number().nonnegative().optional());

const orderCreateSchema = z
  .object({
    specificationNumber: z.string().trim().min(1),
    documentDate: z.string().trim().min(1),
    customerId: optionalText,
    customerName: z.string().trim().min(1),
    customerLegalType: z.enum(legalTypes),
    status: z.enum(orderStatuses).default("draft"),
    productionStartedAt: optionalText,
    readyAt: optionalText,
    category: z.object({ name: optionalText }).optional(),
    materialType: z.object({ name: optionalText }).optional(),
    millingType: z.object({ name: optionalText }).optional(),
    thicknessMm: optionalNumber,
    colorCode: optionalText,
    mainNote: optionalText,
    jointingNote: optionalText,
    deliveryRequired: z.boolean().default(false),
    deliveryAddress: optionalText,
    lines: orderLinesInputSchema.default([])
  })
  .superRefine((order, context) => {
    if (order.productionStartedAt && order.productionStartedAt < order.documentDate) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["productionStartedAt"], message: "Дата раньше даты оформления" });
    }
    if (order.readyAt && order.readyAt < order.documentDate) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["readyAt"], message: "Дата раньше даты оформления" });
    }
    if (order.deliveryRequired && !order.deliveryAddress) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["deliveryAddress"], message: "Укажите адрес доставки" });
    }
  });

function makeId(value: string) {
  return value
    .toLowerCase()
    .replaceAll("/", "-")
    .replaceAll(" ", "-")
    .replace(/[^a-zа-я0-9-]/gi, "");
}

function dictionaryItem(value: { name?: string } | undefined, prefix: string) {
  const name = value?.name?.trim();

  if (!name) {
    return undefined;
  }

  return {
    id: `${prefix}-${makeId(name)}`,
    name,
    isActive: true
  };
}

async function ensureMillingType(name: string | undefined) {
  const normalizedName = name?.trim();

  if (!normalizedName) {
    return;
  }

  const dictionaries = await listDictionaries();
  const exists = dictionaries.millingTypes.some(
    (item) => item.name.trim().toLowerCase() === normalizedName.toLowerCase()
  );

  if (!exists) {
    await createDictionaryItem("millingTypes", { name: normalizedName });
  }
}

export async function POST(request: Request) {
  const auth = await requireApiRole(["admin", "manager"]);

  if (auth.response) {
    return auth.response;
  }

  const body = await readJsonBody(request);

  if (!body.ok) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = orderCreateSchema.safeParse(body.data);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  await ensureMillingType(payload.millingType?.name);

  const existingOrders = await listOrders();

  if (
    existingOrders.some(
      (order) =>
        order.specificationNumber.trim().toLowerCase() ===
        payload.specificationNumber.trim().toLowerCase()
    )
  ) {
    return NextResponse.json(
      { error: "Такой номер спецификации уже существует", field: "specificationNumber" },
      { status: 409 }
    );
  }

  const orderId = `order-${makeId(payload.specificationNumber)}-${Date.now()}`;
  const createdAt = new Date().toISOString();
  const lines = normalizeOrderLines(orderId, payload.lines);
  const totals = calculateOrderTotals(lines, []);
  const order: Order = {
    id: orderId,
    specificationNumber: payload.specificationNumber,
    documentDate: payload.documentDate,
    customer: {
      id: payload.customerId ?? `customer-${makeId(payload.customerName)}`,
      name: payload.customerName,
      legalType: payload.customerLegalType,
      isActive: true
    },
    customerLegalType: payload.customerLegalType,
    status: payload.status,
    productionStartedAt: payload.productionStartedAt,
    readyAt: payload.readyAt,
    category: dictionaryItem(payload.category, "category"),
    materialType: dictionaryItem(payload.materialType, "material"),
    millingType: dictionaryItem(payload.millingType, "milling"),
    thicknessMm: payload.thicknessMm,
    colorCode: payload.colorCode,
    mainNote: payload.mainNote,
    jointingNote: payload.jointingNote,
    deliveryRequired: payload.deliveryRequired,
    deliveryAddress: payload.deliveryAddress,
    totalAreaM2: totals.totalAreaM2,
    subtotalAmount: totals.subtotalAmount,
    discountAmount: totals.discountAmount,
    surchargeAmount: totals.surchargeAmount,
    prepaymentAmount: totals.prepaymentAmount,
    balanceAmount: totals.balanceAmount,
    totalAmount: totals.totalAmount,
    lines,
    payments: [],
    statusHistory: [
      {
        id: `${orderId}-created`,
        orderId,
        status: payload.status,
        changedAt: createdAt,
        comment: "Manual order creation"
      }
    ],
    createdAt,
    updatedAt: createdAt
  };

  await saveOrder(order);

  return NextResponse.json({ data: order }, { status: 201 });
}

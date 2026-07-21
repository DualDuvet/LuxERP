import { NextResponse } from "next/server";
import { z } from "zod";
import { readJsonBody } from "@/lib/api-json";
import { canManageProduction, requireApiRole, requireApiUser } from "@/lib/auth";
import {
  archiveOrder,
  appendStatusHistory,
  applyQrStatusTransition,
  isQrStatusChoice,
  qrStatusChoices,
  type QrStatusChoice
} from "@/lib/order-status-flow";
import { createDictionaryItem, listDictionaries } from "@/lib/dictionary-store";
import { getOrderById, updateOrder } from "@/lib/order-store";
import { orderStatuses } from "@/lib/types";
import type { Order } from "@/lib/types";

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

  return NextResponse.json({ data: order });
}

const dictionaryPatchSchema = z.object({
  name: z.string().trim().optional().nullable()
});

const emptyStringToUndefined = (value: unknown) => (value === "" ? undefined : value);
const optionalText = z.preprocess(emptyStringToUndefined, z.string().trim().optional());
const optionalNumber = z.preprocess(emptyStringToUndefined, z.coerce.number().nonnegative().optional());
const optionalStatusAction = z.preprocess(
  emptyStringToUndefined,
  z.enum(qrStatusChoices).optional()
);

const orderPatchSchema = z.object({
  customerName: z.string().trim().min(1).optional(),
  customerLegalType: z.enum(["ООО", "ИП", "ч/л", "ЗАО"]).optional(),
  status: z.enum(orderStatuses).optional(),
  statusAction: optionalStatusAction,
  documentDate: optionalText,
  productionStartedAt: optionalText,
  readyAt: optionalText,
  shippedAt: optionalText,
  category: dictionaryPatchSchema.optional().nullable(),
  materialType: dictionaryPatchSchema.optional().nullable(),
  millingType: dictionaryPatchSchema.optional().nullable(),
  thicknessMm: optionalNumber,
  colorCode: optionalText,
  jointingNote: optionalText,
  deliveryRequired: z.boolean().optional(),
  deliveryAddress: optionalText,
  prepaymentAmount: optionalNumber,
  totalAmount: optionalNumber
});

function makeId(value: string) {
  return value
    .toLowerCase()
    .replaceAll("/", "-")
    .replaceAll(" ", "-")
    .replace(/[^a-zа-я0-9-]/gi, "");
}

function dictionaryPatch(
  current: Order["category"],
  value: z.infer<typeof dictionaryPatchSchema> | null | undefined,
  prefix: string
) {
  if (value === undefined) {
    return current;
  }

  const name = value?.name?.trim();

  if (!name) {
    return undefined;
  }

  return {
    id: current?.name === name ? current.id : `${prefix}-${makeId(name)}`,
    name,
    isActive: true
  };
}

async function ensureMillingType(name: string | undefined | null) {
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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();

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

  const productionPatchKeys = new Set(["status", "statusAction", "productionStartedAt", "readyAt", "shippedAt"]);
  const isProductionOnlyPatch = Object.keys(body.data).every((key) => productionPatchKeys.has(key));

  if (!["admin", "manager"].includes(auth.user.role) && !(canManageProduction(auth.user.role) && isProductionOnlyPatch)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = orderPatchSchema.safeParse(body.data);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid order payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  await ensureMillingType(payload.millingType?.name);

  const totalAmount = payload.totalAmount ?? order.totalAmount;
  const prepaymentAmount = payload.prepaymentAmount ?? order.prepaymentAmount;

  let statusPatch: Pick<Order, "status" | "statusHistory" | "productionStartedAt" | "readyAt" | "shippedAt"> = {
    status: order.status,
    statusHistory: order.statusHistory,
    productionStartedAt: payload.productionStartedAt ?? order.productionStartedAt,
    readyAt: payload.readyAt ?? order.readyAt,
    shippedAt: payload.shippedAt ?? order.shippedAt
  };

  try {
    if (payload.statusAction) {
      statusPatch = applyQrStatusTransition(order, payload.statusAction as QrStatusChoice, {
        changedBy: auth.user.id,
        comment: "Изменение статуса из карточки заказа",
        productionStartedAt: payload.productionStartedAt,
        readyAt: payload.readyAt,
        shippedAt: payload.shippedAt
      });
    } else if (payload.status && payload.status !== order.status) {
      if (isQrStatusChoice(payload.status)) {
        statusPatch = applyQrStatusTransition(order, payload.status, {
          changedBy: auth.user.id,
          comment: "Изменение статуса из карточки заказа",
          productionStartedAt: payload.productionStartedAt,
          readyAt: payload.readyAt,
          shippedAt: payload.shippedAt
        });
      } else if (payload.status === "cancelled") {
        const archived = archiveOrder(order, {
          changedBy: auth.user.id,
          comment: "Заказ переведён в архив из карточки заказа"
        });

        statusPatch = {
          ...statusPatch,
          status: archived.status,
          statusHistory: archived.statusHistory
        };
      } else {
        statusPatch = {
          ...statusPatch,
          status: payload.status,
          statusHistory: appendStatusHistory(order, payload.status, {
            changedBy: auth.user.id,
            comment: "Manual status update"
          })
        };
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_QR_STATUS_TRANSITION") {
      return NextResponse.json({ error: "Status transition is not allowed" }, { status: 409 });
    }

    throw error;
  }

  const updatedOrder = await updateOrder(order.id, {
    documentDate: payload.documentDate ?? order.documentDate,
    customerLegalType: payload.customerLegalType ?? order.customerLegalType,
    customer: {
      ...order.customer,
      name: payload.customerName ?? order.customer.name,
      legalType: payload.customerLegalType ?? order.customer.legalType
    },
    ...statusPatch,
    category: dictionaryPatch(order.category, payload.category, "category"),
    materialType: dictionaryPatch(order.materialType, payload.materialType, "material"),
    millingType: dictionaryPatch(order.millingType, payload.millingType, "milling"),
    thicknessMm: payload.thicknessMm ?? undefined,
    colorCode: payload.colorCode ?? undefined,
    jointingNote: payload.jointingNote ?? undefined,
    deliveryRequired: payload.deliveryRequired ?? order.deliveryRequired,
    deliveryAddress:
      payload.deliveryRequired === undefined
        ? order.deliveryRequired
          ? payload.deliveryAddress ?? order.deliveryAddress
          : undefined
        : payload.deliveryRequired
          ? payload.deliveryAddress ?? order.deliveryAddress
          : undefined,
    prepaymentAmount,
    totalAmount,
    balanceAmount: totalAmount - prepaymentAmount
  });

  return NextResponse.json({ data: updatedOrder });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole(["admin", "manager"]);

  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const updatedOrder = await updateOrder(
    order.id,
    archiveOrder(order, {
      changedBy: auth.user.id,
      comment: "Order archived"
    })
  );

  return NextResponse.json({ data: updatedOrder });
}

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { orders as seedOrders } from "@/lib/mock-data";
import {
  canUsePrismaOrderStore,
  getPrismaOrderById,
  listPrismaOrders,
  savePrismaOrder
} from "@/lib/prisma-order-store";
import type { Order } from "@/lib/types";

const dataDir = path.join(process.cwd(), ".data");
const ordersDir = path.join(dataDir, "orders");

function normalizeOrder(order: Order): Order {
  return {
    ...order,
    deliveryRequired: order.deliveryRequired ?? false,
    deliveryAddress: order.deliveryAddress ?? undefined
  };
}

async function readJsonOrder(filePath: string): Promise<Order | null> {
  try {
    const content = await readFile(filePath, "utf8");
    return normalizeOrder(JSON.parse(content) as Order);
  } catch {
    return null;
  }
}

export async function listStoredOrders() {
  await mkdir(ordersDir, { recursive: true });
  const fileNames = await readdir(ordersDir);
  const orders = await Promise.all(
    fileNames
      .filter((fileName) => fileName.endsWith(".json"))
      .map((fileName) => readJsonOrder(path.join(ordersDir, fileName)))
  );

  return orders.filter((order): order is Order => Boolean(order));
}

export async function listOrders() {
  if (await canUsePrismaOrderStore()) {
    const prismaOrders = await listPrismaOrders();
    const merged = new Map<string, Order>();

    for (const order of seedOrders) {
      merged.set(order.id, normalizeOrder(order));
    }

    for (const order of prismaOrders) {
      merged.set(order.id, normalizeOrder(order));
    }

    return [...merged.values()].sort((first, second) =>
      second.documentDate.localeCompare(first.documentDate)
    );
  }

  const storedOrders = await listStoredOrders();
  const merged = new Map<string, Order>();

  for (const order of seedOrders) {
    merged.set(order.id, normalizeOrder(order));
  }

  for (const order of storedOrders) {
    merged.set(order.id, normalizeOrder(order));
  }

  return [...merged.values()].sort((first, second) =>
    second.documentDate.localeCompare(first.documentDate)
  );
}

export async function getOrderById(id: string) {
  if (await canUsePrismaOrderStore()) {
    const prismaOrder = await getPrismaOrderById(id);

    if (prismaOrder) {
      return prismaOrder;
    }
  }

  const orders = await listOrders();
  return orders.find((order) => order.id === id);
}

export async function saveOrder(order: Order) {
  const normalizedOrder = normalizeOrder(order);

  if (await canUsePrismaOrderStore()) {
    await savePrismaOrder(normalizedOrder);
  }

  await mkdir(ordersDir, { recursive: true });
  const filePath = path.join(ordersDir, `${normalizedOrder.id}.json`);
  await writeFile(filePath, JSON.stringify(normalizedOrder, null, 2), "utf8");
  return filePath;
}

export async function updateOrder(id: string, patch: Partial<Order>) {
  const currentOrder = await getOrderById(id);

  if (!currentOrder) {
    return null;
  }

  // Spread the patch first, then restore fields that callers can clear.
  // Arrays and statusHistory keep the existing fallback (callers pass a full
  // value when they change it), but dictionary and address fields must honor an
  // explicit `undefined` from the patch as "clear this value" rather than
  // "keep the old value".
  const nextOrder: Order = {
    ...normalizeOrder(currentOrder),
    ...patch,
    id: currentOrder.id,
    customer: {
      ...currentOrder.customer,
      ...patch.customer
    },
    category: Object.prototype.hasOwnProperty.call(patch, "category") ? patch.category : currentOrder.category,
    materialType: Object.prototype.hasOwnProperty.call(patch, "materialType") ? patch.materialType : currentOrder.materialType,
    millingType: Object.prototype.hasOwnProperty.call(patch, "millingType") ? patch.millingType : currentOrder.millingType,
    lines: patch.lines ?? currentOrder.lines,
    payments: patch.payments ?? currentOrder.payments,
    statusHistory: patch.statusHistory ?? currentOrder.statusHistory,
    createdAt: currentOrder.createdAt,
    updatedAt: new Date().toISOString()
  };

  const normalizedOrder = normalizeOrder(nextOrder);
  await saveOrder(normalizedOrder);
  return normalizedOrder;
}

import type { Order, OrderStatus, OrderStatusHistoryItem } from "@/lib/types";

export const orderStatusLabels: Record<OrderStatus, string> = {
  draft: "Черновик",
  confirmed: "Подтверждён",
  in_production: "В производстве",
  on_hold: "Ожидание",
  ready: "Готов",
  shipped: "Отгружен",
  closed: "Закрыт",
  cancelled: "В архиве"
};

export const qrStatusChoices = ["confirmed", "in_production", "on_hold", "ready", "shipped", "closed"] as const;

export type QrStatusChoice = (typeof qrStatusChoices)[number];

export function isQrStatusChoice(value: string): value is QrStatusChoice {
  return qrStatusChoices.includes(value as QrStatusChoice);
}

export const qrStatusActionDescriptions: Record<QrStatusChoice, string> = {
  confirmed: "Подтвердить заказ",
  in_production: "Зафиксировать запуск в работу",
  on_hold: "Поставить заказ в ожидание",
  ready: "Зафиксировать фактическую готовность в истории",
  shipped: "Сохранить фактическую отгрузку",
  closed: "Закрыть заказ и перевести в архив"
};

const qrStatusTransitions: Record<OrderStatus, readonly QrStatusChoice[]> = {
  draft: ["confirmed"],
  confirmed: ["in_production", "on_hold"],
  in_production: ["on_hold", "ready"],
  on_hold: ["in_production", "ready"],
  ready: ["shipped"],
  shipped: ["closed"],
  closed: ["closed"],
  cancelled: []
};

function toDateOnly(value: string) {
  return value.slice(0, 10);
}

function defaultQrComment(action: QrStatusChoice) {
  if (action === "closed") {
    return "Закрытие заказа через QR с переводом в архив";
  }

  return "Изменение статуса через QR";
}

export function getQrStatusChoices(status: OrderStatus) {
  return qrStatusTransitions[status];
}

export function canTransitionOrderStatus(currentStatus: OrderStatus, nextStatus: QrStatusChoice) {
  return getQrStatusChoices(currentStatus).includes(nextStatus);
}

export function getQrStatusActionLabel(currentStatus: OrderStatus, action: QrStatusChoice) {
  if (action !== "closed") {
    return orderStatusLabels[action];
  }

  return currentStatus === "closed" ? "В архив" : "Закрыть и в архив";
}

export function appendStatusHistory(
  order: Order,
  nextStatus: OrderStatus,
  options?: {
    changedBy?: string;
    comment?: string;
    changedAt?: string;
  }
) {
  if (nextStatus === order.status) {
    return order.statusHistory;
  }

  const changedAt = options?.changedAt ?? new Date().toISOString();
  const statusId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const item: OrderStatusHistoryItem = {
    id: `${order.id}-status-${statusId}`,
    orderId: order.id,
    status: nextStatus,
    changedAt,
    changedBy: options?.changedBy,
    comment: options?.comment ?? "Обновление статуса"
  };

  return [...order.statusHistory, item];
}

export function getLatestStatusHistoryItem(order: Order, status: OrderStatus) {
  const matches = order.statusHistory.filter((item) => item.status === status);

  if (matches.length === 0) {
    return undefined;
  }

  return matches.sort((first, second) => second.changedAt.localeCompare(first.changedAt))[0];
}

export function archiveOrder(
  order: Order,
  options?: {
    changedBy?: string;
    comment?: string;
    changedAt?: string;
  }
) {
  if (order.status === "cancelled") {
    return {
      status: order.status,
      statusHistory: order.statusHistory
    };
  }

  return {
    status: "cancelled" as const,
    statusHistory: appendStatusHistory(order, "cancelled", {
      changedAt: options?.changedAt,
      changedBy: options?.changedBy,
      comment: options?.comment ?? "Заказ переведён в архив"
    })
  };
}

export function applyQrStatusTransition(
  order: Order,
  action: QrStatusChoice,
  options?: {
    changedAt?: string;
    changedBy?: string;
    comment?: string;
    productionStartedAt?: string;
    readyAt?: string;
    shippedAt?: string;
  }
) {
  if (!canTransitionOrderStatus(order.status, action)) {
    throw new Error("INVALID_QR_STATUS_TRANSITION");
  }

  const changedAt = options?.changedAt ?? new Date().toISOString();
  const actualDate = toDateOnly(changedAt);
  const nextStatus: OrderStatus = action === "closed" ? "cancelled" : action;

  if (action === "closed") {
    const archived = archiveOrder(order, {
      changedAt,
      changedBy: options?.changedBy,
      comment: options?.comment ?? defaultQrComment(action)
    });

    return {
      status: archived.status,
      productionStartedAt: options?.productionStartedAt ?? order.productionStartedAt,
      readyAt: options?.readyAt ?? order.readyAt,
      shippedAt: options?.shippedAt ?? order.shippedAt ?? actualDate,
      statusHistory: archived.statusHistory
    };
  }

  return {
    status: nextStatus,
    productionStartedAt:
      options?.productionStartedAt ??
      (action === "in_production" ? order.productionStartedAt ?? actualDate : order.productionStartedAt),
    readyAt: options?.readyAt ?? order.readyAt,
    shippedAt: options?.shippedAt ?? (action === "shipped" ? order.shippedAt ?? actualDate : order.shippedAt),
    statusHistory: appendStatusHistory(order, nextStatus, {
      changedAt,
      changedBy: options?.changedBy,
      comment: options?.comment ?? defaultQrComment(action)
    })
  };
}

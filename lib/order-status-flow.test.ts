import { describe, expect, it } from "vitest";
import { applyQrStatusTransition, getQrStatusChoices } from "@/lib/order-status-flow";
import type { Order } from "@/lib/types";

function createOrderFixture(overrides: Partial<Order> = {}): Order {
  return {
    id: "order-1",
    specificationNumber: "SPEC-1",
    documentDate: "2026-06-10",
    customer: {
      id: "customer-1",
      name: "Test Customer",
      legalType: "ООО",
      isActive: true
    },
    customerLegalType: "ООО",
    status: "confirmed",
    productionStartedAt: undefined,
    readyAt: undefined,
    shippedAt: undefined,
    totalAreaM2: 0,
    subtotalAmount: 0,
    discountAmount: 0,
    surchargeAmount: 0,
    prepaymentAmount: 0,
    balanceAmount: 0,
    totalAmount: 0,
    lines: [],
    payments: [],
    statusHistory: [],
    createdAt: "2026-06-10T08:00:00.000Z",
    updatedAt: "2026-06-10T08:00:00.000Z",
    ...overrides
  };
}

describe("order status QR flow", () => {
  it("returns allowed actions for production states", () => {
    expect(getQrStatusChoices("in_production")).toEqual(["on_hold", "ready"]);
    expect(getQrStatusChoices("ready")).toEqual(["shipped"]);
    expect(getQrStatusChoices("cancelled")).toEqual([]);
  });

  it("sets actual ready and shipped dates and archives on close", () => {
    const baseOrder = createOrderFixture({
      status: "in_production" as const,
      productionStartedAt: "2026-06-10",
      readyAt: "2026-06-20",
      shippedAt: undefined
    });

    const readyState = applyQrStatusTransition(baseOrder, "ready", {
      changedAt: "2026-06-16T09:30:00.000Z"
    });

    expect(readyState.status).toBe("ready");
    expect(readyState.readyAt).toBe("2026-06-20");
    expect(readyState.shippedAt).toBeUndefined();
    expect(readyState.statusHistory.at(-1)?.changedAt.slice(0, 10)).toBe("2026-06-16");

    const shippedState = applyQrStatusTransition(
      {
        ...baseOrder,
        status: "ready",
        readyAt: readyState.readyAt
      },
      "shipped",
      {
        changedAt: "2026-06-17T10:45:00.000Z"
      }
    );

    expect(shippedState.status).toBe("shipped");
    expect(shippedState.readyAt).toBe("2026-06-20");
    expect(shippedState.shippedAt).toBe("2026-06-17");

    const archivedState = applyQrStatusTransition(
      {
        ...baseOrder,
        status: "shipped",
        readyAt: "2026-06-20",
        shippedAt: "2026-06-17"
      },
      "closed",
      {
        changedAt: "2026-06-18T12:00:00.000Z"
      }
    );

    expect(archivedState.status).toBe("cancelled");
    expect(archivedState.shippedAt).toBe("2026-06-17");
    expect(archivedState.statusHistory.at(-1)?.status).toBe("cancelled");
  });

  it("creates history for legacy orders without statusHistory", () => {
    const legacyOrder = {
      ...createOrderFixture({
        status: "confirmed"
      }),
      statusHistory: undefined
    } as unknown as Order;

    const nextState = applyQrStatusTransition(legacyOrder, "in_production", {
      changedAt: "2026-06-11T09:00:00.000Z"
    });

    expect(nextState.status).toBe("in_production");
    expect(nextState.productionStartedAt).toBe("2026-06-11");
    expect(nextState.statusHistory).toHaveLength(1);
    expect(nextState.statusHistory[0]?.status).toBe("in_production");
  });
});

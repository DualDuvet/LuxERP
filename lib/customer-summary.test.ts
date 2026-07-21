import { describe, expect, it } from "vitest";
import { decodeCustomerKey, encodeCustomerKey, getCustomerKey, summarizeCustomers } from "@/lib/customer-summary";
import type { Customer, Order } from "@/lib/types";

const ipLegalType = "ИП";

function makeOrder(patch: Partial<Order> & { id: string; customer: Customer }): Order {
  return {
    id: patch.id,
    specificationNumber: patch.specificationNumber ?? patch.id,
    documentDate: patch.documentDate ?? "2026-01-23",
    customer: patch.customer,
    customerLegalType: patch.customer.legalType,
    status: patch.status ?? "confirmed",
    totalAreaM2: 0,
    subtotalAmount: patch.subtotalAmount ?? patch.totalAmount ?? 0,
    discountAmount: 0,
    surchargeAmount: 0,
    prepaymentAmount: patch.prepaymentAmount ?? 0,
    balanceAmount: patch.balanceAmount ?? 0,
    totalAmount: patch.totalAmount ?? 0,
    lines: [],
    payments: [],
    statusHistory: [],
    createdAt: patch.createdAt ?? "2026-01-23T00:00:00.000Z",
    updatedAt: patch.updatedAt ?? "2026-01-23T00:00:00.000Z"
  };
}

describe("customer summaries", () => {
  it("builds a stable route key for customer pages", () => {
    const customer: Customer = {
      id: "customer-ivanov",
      name: "Иванов",
      legalType: ipLegalType,
      isActive: true
    };
    const key = getCustomerKey(customer);

    expect(key).toBe("customer-ivanov");
    expect(decodeCustomerKey(encodeCustomerKey(key))).toBe(key);
  });

  it("groups active orders by customer and ignores cancelled money", () => {
    const customer: Customer = {
      id: "customer-ivanov",
      name: "Иванов",
      legalType: ipLegalType,
      phone: "+7 900 000-00-00",
      isActive: true
    };

    const summaries = summarizeCustomers([
      makeOrder({
        id: "order-1",
        customer,
        totalAmount: 1000.105,
        prepaymentAmount: 400,
        balanceAmount: 600.105
      }),
      makeOrder({
        id: "order-2",
        customer: {
          ...customer,
          phone: undefined,
          email: "ivanov@example.test"
        },
        totalAmount: 500,
        prepaymentAmount: 200,
        balanceAmount: 300
      }),
      makeOrder({
        id: "order-cancelled",
        customer,
        status: "cancelled",
        totalAmount: 9999,
        prepaymentAmount: 9999,
        balanceAmount: 9999
      })
    ]);

    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      orderCount: 3,
      activeOrderCount: 2,
      cancelledOrderCount: 1,
      totalAmount: 1500.11,
      paidAmount: 600,
      currentDebtAmount: 900.11
    });
    expect(summaries[0].customer.phone).toBe("+7 900 000-00-00");
    expect(summaries[0].customer.email).toBe("ivanov@example.test");
  });
});

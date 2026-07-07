import type { Customer, Order } from "@/lib/types";

export type CustomerSummary = {
  key: string;
  routeKey: string;
  customer: Customer;
  orderCount: number;
  activeOrderCount: number;
  cancelledOrderCount: number;
  totalAmount: number;
  paidAmount: number;
  currentDebtAmount: number;
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getCustomerKey(customer: Customer) {
  if (customer.id && customer.id !== "customer-") {
    return customer.id;
  }

  return `${customer.legalType}:${customer.name.trim().toLowerCase()}`;
}

export function encodeCustomerKey(key: string) {
  return Buffer.from(key, "utf8").toString("base64url");
}

export function decodeCustomerKey(routeKey: string) {
  return Buffer.from(routeKey, "base64url").toString("utf8");
}

function mergeContact(current: Customer, next: Customer): Customer {
  return {
    ...current,
    name: current.name || next.name,
    legalType: current.legalType || next.legalType,
    phone: current.phone || next.phone,
    email: current.email || next.email,
    inn: current.inn || next.inn,
    address: current.address || next.address,
    comment: current.comment || next.comment,
    isActive: current.isActive || next.isActive
  };
}

export function summarizeCustomers(orders: Order[]): CustomerSummary[] {
  const summaries = new Map<string, CustomerSummary>();

  for (const order of orders) {
    const key = getCustomerKey(order.customer);
    const isCancelled = order.status === "cancelled";
    const current = summaries.get(key);

    if (!current) {
      summaries.set(key, {
        key,
        routeKey: encodeCustomerKey(key),
        customer: order.customer,
        orderCount: 1,
        activeOrderCount: isCancelled ? 0 : 1,
        cancelledOrderCount: isCancelled ? 1 : 0,
        totalAmount: isCancelled ? 0 : order.totalAmount,
        paidAmount: isCancelled ? 0 : order.prepaymentAmount,
        currentDebtAmount: isCancelled ? 0 : Math.max(order.balanceAmount, 0)
      });
      continue;
    }

    summaries.set(key, {
      ...current,
      customer: mergeContact(current.customer, order.customer),
      orderCount: current.orderCount + 1,
      activeOrderCount: current.activeOrderCount + (isCancelled ? 0 : 1),
      cancelledOrderCount: current.cancelledOrderCount + (isCancelled ? 1 : 0),
      totalAmount: current.totalAmount + (isCancelled ? 0 : order.totalAmount),
      paidAmount: current.paidAmount + (isCancelled ? 0 : order.prepaymentAmount),
      currentDebtAmount: current.currentDebtAmount + (isCancelled ? 0 : Math.max(order.balanceAmount, 0))
    });
  }

  return [...summaries.values()]
    .map((summary) => ({
      ...summary,
      totalAmount: roundMoney(summary.totalAmount),
      paidAmount: roundMoney(summary.paidAmount),
      currentDebtAmount: roundMoney(summary.currentDebtAmount)
    }))
    .sort((first, second) => {
      if (second.currentDebtAmount !== first.currentDebtAmount) {
        return second.currentDebtAmount - first.currentDebtAmount;
      }

      return first.customer.name.localeCompare(second.customer.name, "ru");
    });
}

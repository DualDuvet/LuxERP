import { getCustomerKey, summarizeCustomers } from "@/lib/customer-summary";
import { prisma } from "@/lib/prisma";
import { canUsePrismaOrderStore } from "@/lib/prisma-order-store";
import { listOrders, saveOrder } from "@/lib/order-store";
import type { Customer, CustomerLookupItem, Order } from "@/lib/types";

export type CustomerContactPatch = Pick<Customer, "phone" | "email" | "inn" | "address" | "comment">;

export async function getCustomerOrders(customerKey: string) {
  const orders = await listOrders();
  const customerOrders = orders.filter((order) => getCustomerKey(order.customer) === customerKey);
  const customer = summarizeCustomers(customerOrders)[0];

  if (!customer) {
    return null;
  }

  return {
    customer,
    orders: customerOrders.sort((first, second) => second.documentDate.localeCompare(first.documentDate))
  };
}

export async function updateCustomerContacts(customerKey: string, patch: CustomerContactPatch) {
  const orders = await listOrders();
  const updatedOrders: Order[] = [];

  for (const order of orders) {
    if (getCustomerKey(order.customer) !== customerKey) {
      continue;
    }

    updatedOrders.push({
      ...order,
      customer: {
        ...order.customer,
        ...patch
      },
      updatedAt: new Date().toISOString()
    });
  }

  if (updatedOrders.length === 0) {
    return null;
  }

  await Promise.all(updatedOrders.map((order) => saveOrder(order)));
  return getCustomerOrders(customerKey);
}

export async function findCustomers(query: string, limit = 8): Promise<CustomerLookupItem[]> {
  const normalizedQuery = query.trim();

  if (await canUsePrismaOrderStore()) {
    const customers = await prisma.customer.findMany({
      where: normalizedQuery
        ? {
            name: {
              contains: normalizedQuery,
              mode: "insensitive"
            }
          }
        : undefined,
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      take: limit
    });

    return customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      legalType: customer.legalType as Customer["legalType"],
      isActive: customer.isActive
    }));
  }

  const loweredQuery = normalizedQuery.toLowerCase();

  return summarizeCustomers(await listOrders())
    .map((summary) => summary.customer)
    .filter((customer, index, items) => items.findIndex((item) => item.id === customer.id) === index)
    .filter((customer) => (loweredQuery ? customer.name.toLowerCase().includes(loweredQuery) : true))
    .sort((first, second) => {
      if (first.isActive !== second.isActive) {
        return Number(second.isActive) - Number(first.isActive);
      }

      return first.name.localeCompare(second.name, "ru");
    })
    .slice(0, limit)
    .map((customer) => ({
      id: customer.id,
      name: customer.name,
      legalType: customer.legalType,
      isActive: customer.isActive
    }));
}

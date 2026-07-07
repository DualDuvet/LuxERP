import type { Order } from "@/lib/types";

export const orders: Order[] = [];

export function getOrderById(id: string) {
  return orders.find((order) => order.id === id);
}

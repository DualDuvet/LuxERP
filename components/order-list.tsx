"use client";

import Link from "next/link";
import { ArrowUpRight, Filter, Plus, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/calculations";
import { StatusBadge } from "@/components/status-badge";
import { orderStatuses, type Order, type OrderStatus } from "@/lib/types";

const statusLabels: Record<OrderStatus, string> = {
  draft: "Черновик",
  confirmed: "Подтверждён",
  in_production: "В производстве",
  on_hold: "Ожидание",
  ready: "Готов",
  shipped: "Отгружен",
  closed: "Закрыт",
  cancelled: "Отменён"
};

function isInRange(value: string, from: string, to: string) {
  if (from && value < from) {
    return false;
  }

  if (to && value > to) {
    return false;
  }

  return true;
}

function isOverdue(order: Order) {
  const today = new Date().toISOString().slice(0, 10);
  return Boolean(order.readyAt && order.readyAt < today && !["on_hold", "ready", "shipped", "closed", "cancelled"].includes(order.status));
}

export function OrderList({ orders, canCreate }: { orders: Order[]; canCreate: boolean }) {
  const [query, setQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [withDebt, setWithDebt] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return orders.filter((order) => {
      const haystack = [
        order.specificationNumber,
        order.customerLegalType,
        order.customer.name,
        order.category?.name,
        order.colorCode
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!showArchived && order.status === "cancelled") {
        return false;
      }

      if (normalizedQuery && !haystack.includes(normalizedQuery)) {
        return false;
      }

      if (!isInRange(order.documentDate, dateFrom, dateTo)) {
        return false;
      }

      if (status !== "all" && order.status !== status) {
        return false;
      }

      if (withDebt && order.balanceAmount <= 0) {
        return false;
      }

      if (overdueOnly && !isOverdue(order)) {
        return false;
      }

      return true;
    });
  }, [dateFrom, dateTo, orders, overdueOnly, query, showArchived, status, withDebt]);

  function resetFilters() {
    setQuery("");
    setDateFrom("");
    setDateTo("");
    setStatus("all");
    setWithDebt(false);
    setOverdueOnly(false);
    setShowArchived(false);
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Список заказов</h2>
          <p className="mt-1 text-sm text-muted">
            Найдено {filteredOrders.length} из {orders.length}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm shadow-soft"
          >
            <RotateCcw className="h-4 w-4" />
            Сбросить
          </button>
          {canCreate ? (
            <Link
              href="/orders/new"
              className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white shadow-soft"
            >
              <Plus className="h-4 w-4" />
              Заказ
            </Link>
          ) : null}
        </div>
      </div>

      <div className="rounded-md border border-line bg-white p-4 shadow-soft">
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-ink">
          <Filter className="h-4 w-4" />
          Фильтры
        </div>
        <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-6">
          <label className="space-y-1 xl:col-span-2">
            <span className="text-xs text-muted">Поиск</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Номер, заказчик, категория, исполнитель"
              className="w-full rounded-md border-line text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Дата с</span>
            <input value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} type="date" className="w-full rounded-md border-line text-sm" />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Дата по</span>
            <input value={dateTo} onChange={(event) => setDateTo(event.target.value)} type="date" className="w-full rounded-md border-line text-sm" />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Статус</span>
            <select value={status} onChange={(event) => setStatus(event.target.value as OrderStatus | "all")} className="w-full rounded-md border-line text-sm">
              <option value="all">Все статусы</option>
              {orderStatuses.map((item) => (
                <option key={item} value={item}>
                  {statusLabels[item]}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-end gap-3">
            <label className="inline-flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" checked={withDebt} onChange={(event) => setWithDebt(event.target.checked)} className="rounded border-line" />
              С долгом
            </label>
            <label className="inline-flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" checked={overdueOnly} onChange={(event) => setOverdueOnly(event.target.checked)} className="rounded border-line" />
              Просрочены
            </label>
            <label className="inline-flex items-center gap-2 pb-2 text-sm">
              <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} className="rounded border-line" />
              Архив
            </label>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-line bg-white shadow-soft">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead className="bg-panel text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Номер</th>
              <th className="px-4 py-3 font-medium">Дата</th>
              <th className="px-4 py-3 font-medium">Заказчик</th>
              <th className="px-4 py-3 font-medium">Статус</th>
              <th className="px-4 py-3 font-medium">Готовность</th>
              <th className="px-4 py-3 text-right font-medium">Сумма</th>
              <th className="px-4 py-3 text-right font-medium">Оплачено</th>
              <th className="px-4 py-3 text-right font-medium">Остаток</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <tr key={order.id} className="border-t border-line">
                  <td className="px-4 py-3 font-medium text-ink">{order.specificationNumber}</td>
                  <td className="px-4 py-3 text-muted">{order.documentDate}</td>
                  <td className="px-4 py-3">
                    {order.customerLegalType} {order.customer.name}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3">{order.readyAt ?? "Не указана"}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(order.totalAmount)}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(order.prepaymentAmount)}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatMoney(order.balanceAmount)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/orders/${order.id}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line"
                      aria-label={`Открыть заказ ${order.specificationNumber}`}
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-t border-line">
                <td colSpan={9} className="px-4 py-8 text-center text-sm text-muted">
                  Заказы по выбранным фильтрам не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

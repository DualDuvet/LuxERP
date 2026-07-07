"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Save } from "lucide-react";
import { formatMoney } from "@/lib/calculations";
import { StatusBadge } from "@/components/status-badge";
import type { CustomerSummary } from "@/lib/customer-summary";
import type { Order } from "@/lib/types";

function fieldValue(value: unknown) {
  return value == null ? "" : String(value);
}

export function CustomerCard({
  customer,
  orders,
  canEdit
}: {
  customer: CustomerSummary;
  orders: Order[];
  canEdit: boolean;
}) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    setError("");
    setMessage("");
    setIsSaving(true);

    try {
      const response = await fetch(`/api/customers/${customer.routeKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formData.get("phone"),
          email: formData.get("email"),
          inn: formData.get("inn"),
          address: formData.get("address"),
          comment: formData.get("comment")
        })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Не удалось сохранить контакты");
        return;
      }

      setMessage("Контакты сохранены");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Карточка заказчика</p>
          <h2 className="text-2xl font-semibold text-ink">
            {customer.customer.legalType} {customer.customer.name}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Активных заказов: {customer.activeOrderCount}. Всего заказов: {customer.orderCount}
            {customer.cancelledOrderCount > 0 ? `, архив: ${customer.cancelledOrderCount}` : ""}.
          </p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-line bg-white p-4 shadow-soft">
          <p className="text-xs uppercase text-muted">Сумма заказов</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{formatMoney(customer.totalAmount)}</p>
        </div>
        <div className="rounded-md border border-line bg-white p-4 shadow-soft">
          <p className="text-xs uppercase text-muted">Оплачено</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{formatMoney(customer.paidAmount)}</p>
        </div>
        <div className="rounded-md border border-line bg-white p-4 shadow-soft">
          <p className="text-xs uppercase text-muted">Текущая задолженность</p>
          <p className="mt-2 text-2xl font-semibold text-accent">{formatMoney(customer.currentDebtAmount)}</p>
        </div>
      </section>

      <section>
        <form onSubmit={submit} className="rounded-md border border-line bg-white p-4 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-ink">Контакты</h3>
              <p className="mt-1 text-sm text-muted">Контактные поля сохраняются во все заказы этого заказчика.</p>
            </div>
            {isSaving ? <span className="text-xs text-muted">Сохранение...</span> : null}
          </div>

          <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs text-muted">Телефон</span>
              <input
                name="phone"
                defaultValue={fieldValue(customer.customer.phone)}
                className="w-full rounded-md border-line text-sm"
                disabled={!canEdit || isSaving}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">Email</span>
              <input
                name="email"
                type="email"
                defaultValue={fieldValue(customer.customer.email)}
                className="w-full rounded-md border-line text-sm"
                disabled={!canEdit || isSaving}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted">ИНН</span>
              <input
                name="inn"
                defaultValue={fieldValue(customer.customer.inn)}
                className="w-full rounded-md border-line text-sm"
                disabled={!canEdit || isSaving}
              />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs text-muted">Адрес</span>
              <input
                name="address"
                defaultValue={fieldValue(customer.customer.address)}
                className="w-full rounded-md border-line text-sm"
                disabled={!canEdit || isSaving}
              />
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="text-xs text-muted">Комментарий</span>
              <textarea
                name="comment"
                defaultValue={fieldValue(customer.customer.comment)}
                className="min-h-24 w-full rounded-md border-line text-sm"
                disabled={!canEdit || isSaving}
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {canEdit ? (
              <button
                className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white"
                disabled={isSaving}
              >
                <Save className="h-4 w-4" />
                Сохранить
              </button>
            ) : null}
            {error ? <p className="text-sm text-red-700">{error}</p> : null}
            {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-md border border-line bg-white shadow-soft">
        <div className="border-b border-line px-4 py-3">
          <h3 className="font-semibold text-ink">Заказы заказчика</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-panel text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Номер</th>
                <th className="px-4 py-3 font-medium">Дата</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3 text-right font-medium">Сумма</th>
                <th className="px-4 py-3 text-right font-medium">Оплачено</th>
                <th className="px-4 py-3 text-right font-medium">Остаток</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-line">
                  <td className="px-4 py-3 font-medium text-ink">{order.specificationNumber}</td>
                  <td className="px-4 py-3 text-muted">{order.documentDate}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
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
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

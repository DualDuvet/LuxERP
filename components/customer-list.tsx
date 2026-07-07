"use client";

import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { formatMoney } from "@/lib/calculations";
import type { CustomerSummary } from "@/lib/customer-summary";

function contactValue(value: string | undefined) {
  return value?.trim() || "Не указан";
}

function hasContact(summary: CustomerSummary) {
  return Boolean(
    summary.customer.phone ||
      summary.customer.email ||
      summary.customer.inn ||
      summary.customer.address
  );
}

export function CustomerList({ customers }: { customers: CustomerSummary[] }) {
  const [query, setQuery] = useState("");
  const [debtOnly, setDebtOnly] = useState(false);

  const filteredCustomers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return customers.filter((summary) => {
      if (debtOnly && summary.currentDebtAmount <= 0) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        summary.customer.name,
        summary.customer.legalType,
        summary.customer.phone,
        summary.customer.email,
        summary.customer.inn,
        summary.customer.address,
        summary.customer.comment
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [customers, debtOnly, query]);

  const totals = useMemo(
    () =>
      filteredCustomers.reduce(
        (accumulator, summary) => ({
          totalAmount: accumulator.totalAmount + summary.totalAmount,
          currentDebtAmount: accumulator.currentDebtAmount + summary.currentDebtAmount,
          activeOrderCount: accumulator.activeOrderCount + summary.activeOrderCount
        }),
        { totalAmount: 0, currentDebtAmount: 0, activeOrderCount: 0 }
      ),
    [filteredCustomers]
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-ink">Заказчики</h2>
          <p className="mt-1 text-sm text-muted">
            Найдено {filteredCustomers.length} из {customers.length}
          </p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-line bg-white p-4 shadow-soft">
          <p className="text-xs uppercase text-muted">Активных заказов</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{totals.activeOrderCount}</p>
        </div>
        <div className="rounded-md border border-line bg-white p-4 shadow-soft">
          <p className="text-xs uppercase text-muted">Сумма заказов</p>
          <p className="mt-2 text-2xl font-semibold text-ink">{formatMoney(totals.totalAmount)}</p>
        </div>
        <div className="rounded-md border border-line bg-white p-4 shadow-soft">
          <p className="text-xs uppercase text-muted">Текущая задолженность</p>
          <p className="mt-2 text-2xl font-semibold text-accent">{formatMoney(totals.currentDebtAmount)}</p>
        </div>
      </section>

      <div className="rounded-md border border-line bg-white p-4 shadow-soft">
        <div className="grid gap-3 text-sm md:grid-cols-[1fr_auto] md:items-end">
          <label className="space-y-1">
            <span className="text-xs text-muted">Поиск</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Имя, телефон, email, ИНН или адрес"
                className="w-full rounded-md border-line pl-9 text-sm"
              />
            </div>
          </label>
          <label className="inline-flex items-center gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={debtOnly}
              onChange={(event) => setDebtOnly(event.target.checked)}
              className="rounded border-line"
            />
            Только с долгом
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-line bg-white shadow-soft">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="bg-panel text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Заказчик</th>
              <th className="px-4 py-3 font-medium">Контакты</th>
              <th className="px-4 py-3 font-medium">Заказы</th>
              <th className="px-4 py-3 text-right font-medium">Сумма</th>
              <th className="px-4 py-3 text-right font-medium">Оплачено</th>
              <th className="px-4 py-3 text-right font-medium">Текущий долг</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length > 0 ? (
              filteredCustomers.map((summary) => (
                <tr key={summary.key} className="border-t border-line align-top">
                  <td className="px-4 py-3">
                    <Link href={`/customers/${summary.routeKey}`} className="font-medium text-ink transition hover:text-accent">
                      {summary.customer.legalType} {summary.customer.name}
                    </Link>
                    {summary.customer.comment ? (
                      <p className="mt-1 max-w-xs text-xs text-muted">{summary.customer.comment}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {hasContact(summary) ? (
                      <dl className="grid gap-1 text-xs">
                        <div className="grid grid-cols-[4.5rem_1fr] gap-2">
                          <dt className="text-muted">Телефон</dt>
                          <dd className="text-ink">{contactValue(summary.customer.phone)}</dd>
                        </div>
                        <div className="grid grid-cols-[4.5rem_1fr] gap-2">
                          <dt className="text-muted">Email</dt>
                          <dd className="break-all text-ink">{contactValue(summary.customer.email)}</dd>
                        </div>
                        <div className="grid grid-cols-[4.5rem_1fr] gap-2">
                          <dt className="text-muted">ИНН</dt>
                          <dd className="text-ink">{contactValue(summary.customer.inn)}</dd>
                        </div>
                        <div className="grid grid-cols-[4.5rem_1fr] gap-2">
                          <dt className="text-muted">Адрес</dt>
                          <dd className="max-w-sm text-ink">{contactValue(summary.customer.address)}</dd>
                        </div>
                      </dl>
                    ) : (
                      <span className="text-muted">Контакты не заполнены</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{summary.activeOrderCount}</p>
                    <p className="text-xs text-muted">
                      Всего {summary.orderCount}
                      {summary.cancelledOrderCount > 0 ? `, архив ${summary.cancelledOrderCount}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-right">{formatMoney(summary.totalAmount)}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(summary.paidAmount)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-accent">
                    {formatMoney(summary.currentDebtAmount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/customers/${summary.routeKey}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line"
                      aria-label={`Открыть карточку заказчика ${summary.customer.name}`}
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-t border-line">
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted">
                  Заказчики по выбранным фильтрам не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

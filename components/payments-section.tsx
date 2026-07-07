"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { formatMoney } from "@/lib/calculations";
import type { Payment } from "@/lib/types";

const paymentTypeLabels: Record<Payment["paymentType"], string> = {
  prepayment: "Предоплата",
  final_payment: "Финальный платеж",
  refund: "Возврат",
  correction: "Корректировка"
};

const paymentMethodLabels: Record<NonNullable<Payment["paymentMethod"]>, string> = {
  cash: "Наличные",
  card: "Карта",
  bank_transfer: "Банк",
  other: "Другое"
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function PaymentsSection({
  orderId,
  payments,
  canManage
}: {
  orderId: string;
  payments: Payment[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [deletingPaymentId, setDeletingPaymentId] = useState("");
  const [isPending, startTransition] = useTransition();
  const sortedPayments = [...payments].sort((first, second) => second.paymentDate.localeCompare(first.paymentDate));

  async function createPayment(formData: FormData) {
    setError("");

    const response = await fetch(`/api/orders/${orderId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentType: formData.get("paymentType"),
        amount: formData.get("amount"),
        paymentDate: formData.get("paymentDate"),
        paymentMethod: formData.get("paymentMethod") || undefined,
        comment: formData.get("comment")
      })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Не удалось добавить платеж");
      return;
    }

    startTransition(() => router.refresh());
  }

  async function deletePayment(paymentId: string) {
    setError("");
    setDeletingPaymentId(paymentId);

    const response = await fetch(`/api/orders/${orderId}/payments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId })
    });

    setDeletingPaymentId("");

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Не удалось удалить платеж");
      return;
    }

    startTransition(() => router.refresh());
  }

  return (
    <section className="rounded-md border border-line bg-white shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <h3 className="font-semibold text-ink">Платежи</h3>
          <p className="text-sm text-muted">Предоплаты, финальные платежи, возвраты и корректировки.</p>
          {error ? <p className="mt-1 text-sm text-red-700">{error}</p> : null}
          {isPending ? <p className="mt-1 text-xs text-muted">Обновление карточки...</p> : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-panel text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Дата</th>
              <th className="px-4 py-2 font-medium">Тип</th>
              <th className="px-4 py-2 font-medium">Метод</th>
              <th className="px-4 py-2 font-medium">Комментарий</th>
              <th className="px-4 py-2 text-right font-medium">Сумма</th>
              <th className="w-14 px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {sortedPayments.length > 0 ? (
              sortedPayments.map((payment) => (
                <tr key={payment.id} className="border-t border-line">
                  <td className="px-4 py-3">{payment.paymentDate}</td>
                  <td className="px-4 py-3">{paymentTypeLabels[payment.paymentType]}</td>
                  <td className="px-4 py-3">{payment.paymentMethod ? paymentMethodLabels[payment.paymentMethod] : "-"}</td>
                  <td className="px-4 py-3 text-muted">{payment.comment ?? "-"}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatMoney(payment.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    {canManage ? (
                      <button
                        type="button"
                        onClick={() => deletePayment(payment.id)}
                        disabled={deletingPaymentId === payment.id}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 text-red-700"
                        aria-label="Удалить платеж"
                        title="Удалить платеж"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-t border-line">
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted">
                  Платежей пока нет
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {canManage ? (
        <form action={createPayment} className="grid gap-3 border-t border-line p-4 text-sm md:grid-cols-6">
          <label className="space-y-1">
            <span className="text-xs text-muted">Дата</span>
            <input name="paymentDate" type="date" defaultValue={today()} className="w-full rounded-md border-line text-sm" required />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Тип</span>
            <select name="paymentType" defaultValue="prepayment" className="w-full rounded-md border-line text-sm">
              {Object.entries(paymentTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Метод</span>
            <select name="paymentMethod" defaultValue="bank_transfer" className="w-full rounded-md border-line text-sm">
              {Object.entries(paymentMethodLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Сумма</span>
            <input name="amount" type="number" min="0.01" step="0.01" className="w-full rounded-md border-line text-sm" required />
          </label>
          <label className="space-y-1 md:col-span-2">
            <span className="text-xs text-muted">Комментарий</span>
            <div className="flex gap-2">
              <input name="comment" className="min-w-0 flex-1 rounded-md border-line text-sm" />
              <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white">
                <Plus className="h-4 w-4" />
                Добавить
              </button>
            </div>
          </label>
        </form>
      ) : null}
    </section>
  );
}

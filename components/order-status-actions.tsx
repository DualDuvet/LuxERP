"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Archive, Clock3, PackageCheck, PauseCircle, PlayCircle, Truck } from "lucide-react";
import { getQrStatusActionLabel, qrStatusActionDescriptions, type QrStatusChoice } from "@/lib/order-status-flow";
import type { OrderStatus } from "@/lib/types";

const statusIcons: Record<QrStatusChoice, typeof Clock3> = {
  confirmed: Clock3,
  in_production: PlayCircle,
  on_hold: PauseCircle,
  ready: PackageCheck,
  shipped: Truck,
  closed: Archive
} as const;

export function OrderStatusActions({
  orderId,
  currentStatus,
  actions
}: {
  orderId: string;
  currentStatus: OrderStatus;
  actions: readonly QrStatusChoice[];
}) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [activeAction, setActiveAction] = useState<QrStatusChoice | null>(null);
  const [isPending, startTransition] = useTransition();

  const disabled = isPending || activeAction !== null;
  const actionButtons = useMemo(() => actions, [actions]);

  async function submitStatus(action: QrStatusChoice) {
    if (disabled) {
      return;
    }

    setError("");
    setActiveAction(action);

    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action, comment })
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Не удалось обновить статус");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (nextError) {
      setActiveAction(null);
      setError(nextError instanceof Error ? nextError.message : "Не удалось обновить статус");
    }
  }

  return (
    <>
      {actionButtons.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {actionButtons.map((action) => {
            const Icon = statusIcons[action];
            const isCurrentAction = activeAction === action;

            return (
              <button
                key={action}
                type="button"
                onClick={() => void submitStatus(action)}
                disabled={disabled}
                className="inline-flex min-h-16 items-center justify-between rounded-lg border border-line bg-white px-4 py-3 text-left shadow-soft transition hover:border-accent/40 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="inline-flex items-center gap-3">
                  <Icon className="h-5 w-5 text-accent" />
                  <span>
                    <span className="block font-medium">{getQrStatusActionLabel(currentStatus, action)}</span>
                    <span className="mt-0.5 block text-xs text-muted">{qrStatusActionDescriptions[action]}</span>
                  </span>
                </span>
                {isCurrentAction ? <span className="text-xs text-muted">Сохраняю...</span> : null}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-slate-50 px-4 py-5 text-sm text-muted">
          Для текущего состояния больше нет доступных действий через QR.
        </div>
      )}

      <label className="mt-4 block space-y-2">
        <span className="text-sm text-muted">Комментарий</span>
        <textarea
          rows={3}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          className="w-full rounded-md border border-line px-3 py-2 text-sm"
          placeholder="Причина, цех, примечание"
        />
      </label>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
    </>
  );
}

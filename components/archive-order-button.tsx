"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Archive } from "lucide-react";

export function ArchiveOrderButton({ orderId, disabled }: { orderId: string; disabled: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function archiveOrder() {
    if (disabled || isPending) {
      return;
    }

    const confirmed = window.confirm("Перевести заказ в архив?");

    if (!confirmed) {
      return;
    }

    setError("");

    const response = await fetch(`/api/orders/${orderId}`, {
      method: "DELETE"
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Не удалось архивировать заказ");
      return;
    }

    startTransition(() => {
      router.push("/orders");
      router.refresh();
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={archiveOrder}
        disabled={disabled || isPending}
        className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-sm text-red-700 shadow-soft disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Archive className="h-4 w-4" />
        {disabled ? "В архиве" : "В архив"}
      </button>
      {error ? <p className="absolute right-0 mt-1 w-56 text-right text-xs text-red-700">{error}</p> : null}
    </div>
  );
}

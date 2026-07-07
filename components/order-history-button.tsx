"use client";

import { useState } from "react";
import { History, X } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import type { OrderStatusHistoryItem } from "@/lib/types";

export function OrderHistoryButton({ history }: { history: OrderStatusHistoryItem[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const sortedHistory = [...history].sort((first, second) => second.changedAt.localeCompare(first.changedAt));

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm shadow-soft"
      >
        <History className="h-4 w-4" />
        История
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-md border border-line bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h3 className="font-semibold text-ink">История изменений</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line"
                aria-label="Закрыть историю"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto">
              {sortedHistory.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-panel text-left text-xs uppercase text-muted">
                    <tr>
                      <th className="px-4 py-2 font-medium">Дата</th>
                      <th className="px-4 py-2 font-medium">Статус</th>
                      <th className="px-4 py-2 font-medium">Комментарий</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedHistory.map((item) => (
                      <tr key={item.id} className="border-t border-line">
                        <td className="px-4 py-3 text-muted">{new Date(item.changedAt).toLocaleString("ru-RU")}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-4 py-3">{item.comment ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-4 py-8 text-center text-sm text-muted">История пока пустая</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

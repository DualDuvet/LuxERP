import type { OrderStatus } from "@/lib/types";

const labels: Record<OrderStatus, string> = {
  draft: "Черновик",
  confirmed: "Подтверждён",
  in_production: "В производстве",
  on_hold: "Ожидание",
  ready: "Готов",
  shipped: "Отгружен",
  closed: "Закрыт",
  cancelled: "В архиве"
};

const colors: Record<OrderStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  confirmed: "bg-blue-100 text-blue-800",
  in_production: "bg-amber-100 text-amber-800",
  on_hold: "bg-rose-100 text-rose-800",
  ready: "bg-emerald-100 text-emerald-800",
  shipped: "bg-cyan-100 text-cyan-800",
  closed: "bg-zinc-100 text-zinc-700",
  cancelled: "bg-zinc-100 text-zinc-700"
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex rounded px-2 py-1 text-xs font-medium ${colors[status]}`}>
      {labels[status]}
    </span>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { OrderStatusActions } from "@/components/order-status-actions";
import { StatusBadge } from "@/components/status-badge";
import { getCurrentUser } from "@/lib/auth";
import { getOrderById } from "@/lib/order-store";
import { getLatestStatusHistoryItem, getQrStatusChoices, orderStatusLabels } from "@/lib/order-status-flow";

export const dynamic = "force-dynamic";

export default async function OrderStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/orders/${id}/status`)}`);
  }

  const order = await getOrderById(id);

  if (!order) {
    redirect("/orders");
  }

  const availableActions = getQrStatusChoices(order.status);
  const actualReadyAt = getLatestStatusHistoryItem(order, "ready")?.changedAt.slice(0, 10);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-ink">
      <div className="mx-auto max-w-2xl space-y-5">
        <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted">Статус заказа</p>
              <h1 className="mt-1 text-2xl font-semibold">{order.specificationNumber}</h1>
              <p className="mt-2 text-sm text-muted">
                {order.customerLegalType} {order.customer.name}
              </p>
            </div>
            <StatusBadge status={order.status} />
          </div>

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-md border border-line p-3">
              <dt className="text-xs uppercase text-muted">В производство</dt>
              <dd className="mt-1 font-medium">{order.productionStartedAt ?? "Не указана"}</dd>
            </div>
            <div className="rounded-md border border-line p-3">
              <dt className="text-xs uppercase text-muted">Плановая готовность</dt>
              <dd className="mt-1 font-medium">{order.readyAt ?? "Не указана"}</dd>
            </div>
            <div className="rounded-md border border-line p-3">
              <dt className="text-xs uppercase text-muted">Отгрузка</dt>
              <dd className="mt-1 font-medium">{order.shippedAt ?? "Не указана"}</dd>
            </div>
          </dl>
          <div className="mt-3 rounded-md border border-dashed border-line bg-slate-50 px-3 py-2 text-sm text-muted">
            Фактическая готовность: {actualReadyAt ?? "смотрите в истории статусов"}
          </div>
        </section>

        <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
          <div className="mb-4 space-y-1">
            <h2 className="text-base font-semibold">Сменить статус</h2>
            <p className="text-sm text-muted">Текущий статус: {orderStatusLabels[order.status]}</p>
          </div>

          <OrderStatusActions orderId={order.id} currentStatus={order.status} actions={availableActions} />
        </section>

        <div className="flex justify-between">
          <Link href={`/orders/${order.id}`} className="text-sm text-accent underline-offset-4 hover:underline">
            К карточке заказа
          </Link>
        </div>
      </div>
    </main>
  );
}

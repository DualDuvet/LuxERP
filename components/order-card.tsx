import Link from "next/link";
import { FileDown, Pencil, Printer, QrCode } from "lucide-react";
import { ArchiveOrderButton } from "@/components/archive-order-button";
import { OrderHistoryButton } from "@/components/order-history-button";
import { PaymentsSection } from "@/components/payments-section";
import { SpecificationLinesTable } from "@/components/specification-lines-table";
import { StatusBadge } from "@/components/status-badge";
import { formatArea, formatMoney } from "@/lib/calculations";
import { getLatestStatusHistoryItem } from "@/lib/order-status-flow";
import type { Order } from "@/lib/types";

function customerContacts(order: Order) {
  const contacts = [order.customer.phone, order.customer.email].filter(Boolean);
  return contacts.length > 0 ? contacts.join(", ") : "Не указаны";
}

export function OrderCard({
  order,
  canEdit,
  canArchive,
  canManagePayments
}: {
  order: Order;
  canEdit: boolean;
  canArchive: boolean;
  canManagePayments: boolean;
}) {
  const isArchived = order.status === "cancelled";
  const actualReadyAt = getLatestStatusHistoryItem(order, "ready")?.changedAt.slice(0, 10);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Спецификация</p>
          <h2 className="text-2xl font-semibold text-ink">{order.specificationNumber}</h2>
          <div className="mt-2">
            <StatusBadge status={order.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <OrderHistoryButton history={order.statusHistory} />
          {canEdit ? (
            <Link
              href={`/orders/${order.id}/edit`}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white shadow-soft"
            >
              <Pencil className="h-4 w-4" />
              Редактировать
            </Link>
          ) : null}
          <a
            href={`/api/orders/${order.id}/print`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm shadow-soft"
          >
            <Printer className="h-4 w-4" />
            Печать
          </a>
          <Link
            href={`/orders/${order.id}/status`}
            className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm shadow-soft"
          >
            <QrCode className="h-4 w-4" />
            QR-статус
          </Link>
          <a
            href={`/api/orders/${order.id}/pdf`}
            className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm shadow-soft"
          >
            <FileDown className="h-4 w-4" />
            PDF
          </a>
          {canArchive ? <ArchiveOrderButton orderId={order.id} disabled={isArchived} /> : null}
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Заказчик", `${order.customerLegalType} ${order.customer.name}`],
          ["Дата оформления", order.documentDate],
          ["Плановая готовность", order.readyAt ?? "Не указана"],
          ["Остаток", formatMoney(order.balanceAmount)]
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-line bg-white p-4 shadow-soft">
            <p className="text-xs uppercase text-muted">{label}</p>
            <p className="mt-2 text-lg font-semibold text-ink">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-md border border-line bg-white p-4 shadow-soft">
          <h3 className="font-semibold text-ink">Параметры изделия</h3>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <dt className="text-muted">Категория</dt>
            <dd>{order.category?.name ?? "Не указана"}</dd>
            <dt className="text-muted">Материал</dt>
            <dd>{order.materialType?.name ?? "Не указан"}</dd>
            <dt className="text-muted">Толщина</dt>
            <dd>{order.thicknessMm ? `${order.thicknessMm} мм` : "Не указана"}</dd>
            <dt className="text-muted">Фрезеровка</dt>
            <dd>{order.millingType?.name ?? "Не указана"}</dd>
            <dt className="text-muted">Цвет</dt>
            <dd>{order.colorCode ?? "Не указан"}</dd>
            <dt className="text-muted">Стыковка</dt>
            <dd>{order.jointingNote ?? "Не указана"}</dd>
            <dt className="text-muted">Контакты заказчика</dt>
            <dd>{customerContacts(order)}</dd>
            <dt className="text-muted">Доставка</dt>
            <dd>{order.deliveryRequired ? order.deliveryAddress ?? "Адрес не указан" : "Не требуется"}</dd>
            <dt className="text-muted">Фактическая готовность</dt>
            <dd>{actualReadyAt ?? "Смотрите историю статусов"}</dd>
          </dl>
        </div>
        <div className="rounded-md border border-line bg-white p-4 shadow-soft">
          <h3 className="font-semibold text-ink">Итоги</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Площадь</dt>
              <dd>{formatArea(order.totalAreaM2)} м2</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Сумма</dt>
              <dd>{formatMoney(order.totalAmount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Оплачено</dt>
              <dd>{formatMoney(order.prepaymentAmount)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-3 font-semibold">
              <dt>Остаток</dt>
              <dd>{formatMoney(order.balanceAmount)}</dd>
            </div>
          </dl>
        </div>
      </section>

      {canManagePayments ? (
        <PaymentsSection orderId={order.id} payments={order.payments} canManage={canManagePayments} />
      ) : null}
      <SpecificationLinesTable lines={order.lines} />
    </div>
  );
}

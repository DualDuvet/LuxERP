import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { OrderEditForm } from "@/components/order-edit-form";
import { PageShell } from "@/components/page-shell";
import { SpecificationLines } from "@/components/specification-lines";
import { requireAnyRole } from "@/lib/auth";
import { listDictionaries } from "@/lib/dictionary-store";
import { getOrderById } from "@/lib/order-store";

export const dynamic = "force-dynamic";

export default async function OrderEditPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAnyRole(["admin", "manager"]);
  const { id } = await params;
  const [order, dictionaries] = await Promise.all([getOrderById(id), listDictionaries()]);

  if (!order) {
    notFound();
  }

  return (
    <PageShell user={user}>
      <div className="space-y-5 p-4 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link href={`/orders/${order.id}`} className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-ink">
              <ChevronLeft className="h-4 w-4" />
              Назад к карточке заказа
            </Link>
            <h1 className="mt-3 text-2xl font-semibold text-ink">Редактирование заказа {order.specificationNumber}</h1>
            <p className="mt-1 text-sm text-muted">Только рабочие поля для менеджера и упрощённая табличная часть без лишних переключателей.</p>
          </div>
        </div>

        <OrderEditForm
          key={`order-edit-${order.updatedAt}-${order.totalAmount}-${order.prepaymentAmount}-${order.balanceAmount}`}
          order={order}
          dictionaries={dictionaries}
        />
        <SpecificationLines
          key={`order-lines-${order.updatedAt}-${order.lines.length}-${order.totalAmount}-${order.balanceAmount}`}
          orderId={order.id}
          lines={order.lines}
        />
      </div>
    </PageShell>
  );
}

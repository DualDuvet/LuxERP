import { notFound } from "next/navigation";
import { OrderCard } from "@/components/order-card";
import { PageShell } from "@/components/page-shell";
import { canManageOrders, canManagePayments, requireUser } from "@/lib/auth";
import { getOrderById } from "@/lib/order-store";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    notFound();
  }

  const canViewPayments = canManagePayments(user.role);
  const visibleOrder = canViewPayments ? order : { ...order, payments: [] };

  return (
    <PageShell user={user}>
      <div className="p-4 md:p-8">
        <OrderCard
          order={visibleOrder}
          canEdit={canManageOrders(user.role)}
          canArchive={canManageOrders(user.role)}
          canManagePayments={canViewPayments}
        />
      </div>
    </PageShell>
  );
}

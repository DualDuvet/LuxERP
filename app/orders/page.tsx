import { OrderList } from "@/components/order-list";
import { PageShell } from "@/components/page-shell";
import { canManageOrders, requireUser } from "@/lib/auth";
import { listOrders } from "@/lib/order-store";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await requireUser();
  const orders = await listOrders();

  return (
    <PageShell user={user}>
      <div className="p-4 md:p-8">
        <OrderList orders={orders} canCreate={canManageOrders(user.role)} />
      </div>
    </PageShell>
  );
}

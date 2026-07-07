import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { CustomerCard } from "@/components/customer-card";
import { PageShell } from "@/components/page-shell";
import { canManageOrders, requireUser } from "@/lib/auth";
import { decodeCustomerKey } from "@/lib/customer-summary";
import { getCustomerOrders } from "@/lib/customer-store";

export const dynamic = "force-dynamic";

export default async function CustomerPage({ params }: { params: Promise<{ key: string }> }) {
  const user = await requireUser();
  const { key } = await params;
  const customerKey = decodeCustomerKey(key);
  const data = await getCustomerOrders(customerKey);

  if (!data) {
    notFound();
  }

  return (
    <PageShell user={user}>
      <div className="space-y-5 p-4 md:p-8">
        <Link href="/customers" className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-ink">
          <ChevronLeft className="h-4 w-4" />
          Назад к заказчикам
        </Link>
        <CustomerCard customer={data.customer} orders={data.orders} canEdit={canManageOrders(user.role)} />
      </div>
    </PageShell>
  );
}

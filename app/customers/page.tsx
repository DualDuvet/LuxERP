import { CustomerList } from "@/components/customer-list";
import { PageShell } from "@/components/page-shell";
import { requireUser } from "@/lib/auth";
import { summarizeCustomers } from "@/lib/customer-summary";
import { listOrders } from "@/lib/order-store";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const user = await requireUser();
  const orders = await listOrders();
  const customers = summarizeCustomers(orders);

  return (
    <PageShell user={user}>
      <div className="p-4 md:p-8">
        <CustomerList customers={customers} />
      </div>
    </PageShell>
  );
}

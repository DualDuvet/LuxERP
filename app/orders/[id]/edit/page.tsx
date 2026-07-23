import { notFound } from "next/navigation";
import { OrderFormPage } from "@/components/order-form-page";
import { PageShell } from "@/components/page-shell";
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
      <OrderFormPage mode="edit" order={order} dictionaries={dictionaries} />
    </PageShell>
  );
}

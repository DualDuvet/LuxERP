import { OrderFormPage } from "@/components/order-form-page";
import { PageShell } from "@/components/page-shell";
import { requireAnyRole } from "@/lib/auth";
import { listDictionaries } from "@/lib/dictionary-store";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const user = await requireAnyRole(["admin", "manager"]);
  const dictionaries = await listDictionaries();

  return (
    <PageShell user={user}>
      <OrderFormPage mode="create" dictionaries={dictionaries} />
    </PageShell>
  );
}

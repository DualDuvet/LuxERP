import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { OrderCreateForm } from "@/components/order-create-form";
import { PageShell } from "@/components/page-shell";
import { requireAnyRole } from "@/lib/auth";
import { listDictionaries } from "@/lib/dictionary-store";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const user = await requireAnyRole(["admin", "manager"]);
  const dictionaries = await listDictionaries();

  return (
    <PageShell user={user}>
      <div className="space-y-5 p-4 md:p-8">
        <div>
          <Link href="/orders" className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-ink">
            <ChevronLeft className="h-4 w-4" />
            Назад к списку заказов
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-ink">Создание заказа</h1>
          <p className="mt-1 text-sm text-muted">После создания можно добавить строки спецификации и платежи в карточке заказа.</p>
        </div>

        <OrderCreateForm dictionaries={dictionaries} />
      </div>
    </PageShell>
  );
}

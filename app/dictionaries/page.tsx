import { DictionariesManagement } from "@/components/dictionaries-management";
import { PageShell } from "@/components/page-shell";
import { requireUser } from "@/lib/auth";
import { listDictionaries } from "@/lib/dictionary-store";

export const dynamic = "force-dynamic";

export default async function DictionariesPage() {
  const user = await requireUser();
  const dictionaries = await listDictionaries();

  return (
    <PageShell user={user}>
      <div className="p-4 md:p-8">
        <DictionariesManagement dictionaries={dictionaries} canEdit={user.role === "admin"} />
      </div>
    </PageShell>
  );
}

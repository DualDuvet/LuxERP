import { PageShell } from "@/components/page-shell";
import { UsersManagement } from "@/components/users-management";
import { listManagedUsers, requireAnyRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const user = await requireAnyRole(["admin"]);
  const users = await listManagedUsers();

  return (
    <PageShell user={user}>
      <div className="p-4 md:p-8">
        <UsersManagement users={users} currentUserId={user.id} />
      </div>
    </PageShell>
  );
}

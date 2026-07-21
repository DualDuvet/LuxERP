import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/safe-next-path";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const { next = "/orders" } = await searchParams;
  const safeNext = safeNextPath(next);

  if (user) {
    redirect(safeNext);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-ink">
      <div className="w-full max-w-sm space-y-4">
        <div className="px-1">
          <p className="text-xs uppercase tracking-wide text-muted">LuxERP</p>
          <h1 className="mt-1 text-2xl font-semibold">Вход в систему</h1>
        </div>
        <LoginForm nextPath={safeNext} />
      </div>
    </main>
  );
}

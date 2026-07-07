import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/safe-next-path";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  const { next = "/orders", error } = await searchParams;
  const safeNext = safeNextPath(next);

  if (user) {
    redirect(safeNext);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-ink">
      <form
        action="/api/auth/login"
        method="post"
        className="w-full max-w-sm space-y-4 rounded-2xl border border-line bg-white p-6 shadow-soft"
      >
        <input type="hidden" name="next" value={safeNext} />
        <label className="block space-y-2">
          <span className="text-sm text-muted">PIN</span>
          <input
            name="pin"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]{6}"
            enterKeyHint="go"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            minLength={6}
            required
            className="w-full rounded-xl border border-line px-4 py-4 text-center text-3xl tracking-[0.45em] outline-none transition focus:border-accent"
          />
        </label>
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            Неверный PIN-код.
          </p>
        ) : null}
        {safeNext.startsWith("/orders/") && safeNext.endsWith("/status") ? (
          <p className="text-sm text-muted">После входа откроется страница изменения статуса заказа.</p>
        ) : null}
        <button className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-medium text-white shadow-soft">
          Войти
        </button>
      </form>
    </main>
  );
}

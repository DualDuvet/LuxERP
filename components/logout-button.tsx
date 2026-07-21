"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();

  async function logout() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className={
        compact
          ? "inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white text-muted transition hover:text-ink"
          : "inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm text-muted transition hover:text-ink"
      }
      aria-label="Выйти"
      title="Выйти"
    >
      <LogOut className={compact ? "h-4 w-4" : "h-3.5 w-3.5"} />
      {compact ? null : "Выйти"}
    </button>
  );
}

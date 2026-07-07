import Link from "next/link";
import { Building2, ClipboardList, LogOut, Settings, UserCog } from "lucide-react";
import { getRoleLabel } from "@/lib/roles";
import type { CurrentUser } from "@/lib/auth";

const navItems = [
  { href: "/orders", label: "Заказы", icon: ClipboardList },
  { href: "/customers", label: "Заказчики", icon: Building2 },
  { href: "/dictionaries", label: "Справочники", icon: Settings },
  { href: "/users", label: "Пользователи", icon: UserCog, adminOnly: true }
];

export function PageShell({ children, user }: { children: React.ReactNode; user: CurrentUser }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 px-4 py-3 shadow-soft backdrop-blur">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center justify-between gap-3">
            <Link href="/orders" className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted">LuxERP</p>
              <h1 className="mt-0.5 text-xl font-semibold text-ink">Спецификации</h1>
            </Link>
            <form action="/api/auth/logout" method="post" className="xl:hidden">
              <button className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white text-muted transition hover:text-ink" aria-label="Выйти" title="Выйти">
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>

          <nav className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {navItems
              .filter((item) => !item.adminOnly || user.role === "admin")
              .map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-ink transition hover:border-accent hover:text-accent sm:justify-start"
                  >
                    <Icon className="h-4 w-4 text-accent" />
                    {item.label}
                  </Link>
                );
              })}
          </nav>

          <div className="hidden items-center gap-3 text-sm xl:flex">
            <div className="text-right">
              <p className="font-medium text-ink">{user.name}</p>
              <p className="text-xs text-muted">{getRoleLabel(user.role)}</p>
            </div>
            <form action="/api/auth/logout" method="post">
              <button className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm text-muted transition hover:text-ink">
                <LogOut className="h-3.5 w-3.5" />
                Выйти
              </button>
            </form>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

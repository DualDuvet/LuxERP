"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Save } from "lucide-react";
import { getRoleLabel, userRoles } from "@/lib/roles";
import type { UserRole } from "@/lib/types";

type ManagedUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
};

const userGridColumns = "grid-cols-[1.15fr_1.25fr_1fr_0.6fr_0.85fr_0.55fr]";

export function UsersManagement({
  users,
  currentUserId
}: {
  users: ManagedUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function refreshAfter(response: Response, fallbackError: string) {
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? fallbackError);
      return;
    }

    setError("");
    startTransition(() => router.refresh());
  }

  async function createUser(formData: FormData) {
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        role: formData.get("role"),
        pin: formData.get("pin")
      })
    });

    await refreshAfter(response, "Не удалось создать пользователя");
  }

  async function updateUser(userId: string, formData: FormData) {
    const response = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        role: formData.get("role"),
        isActive: formData.get("isActive") === "on",
        pin: formData.get("pin")
      })
    });

    await refreshAfter(response, "Не удалось обновить пользователя");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Пользователи</h1>
        <p className="mt-1 text-sm text-muted">Управление ролями, активностью и 6-значными PIN-кодами.</p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <section className="rounded-md border border-line bg-white p-4 shadow-soft">
        <h2 className="font-semibold text-ink">Новый пользователь</h2>
        <form action={createUser} className="mt-4 grid gap-3 text-sm md:grid-cols-5">
          <label className="space-y-1">
            <span className="text-xs text-muted">Имя</span>
            <input name="name" className="w-full rounded-md border-line text-sm" required />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Email</span>
            <input name="email" type="email" className="w-full rounded-md border-line text-sm" />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Роль</span>
            <select name="role" defaultValue="viewer" className="w-full rounded-md border-line text-sm">
              {userRoles.map((role) => (
                <option key={role} value={role}>
                  {getRoleLabel(role)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">PIN</span>
            <input
              name="pin"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              minLength={6}
              className="w-full rounded-md border-line text-sm"
              required
            />
          </label>
          <div className="flex items-end">
            <button className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white" disabled={isPending}>
              <Plus className="h-4 w-4" />
              Создать
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-x-auto rounded-md border border-line bg-white shadow-soft">
        <div className="min-w-[900px] text-sm">
          <div className={`grid ${userGridColumns} gap-3 bg-panel px-4 py-3 text-xs uppercase text-muted`}>
            <div className="font-medium">Имя</div>
            <div className="font-medium">Email</div>
            <div className="font-medium">Роль</div>
            <div className="font-medium">Активен</div>
            <div className="font-medium">Новый PIN</div>
            <div />
          </div>

          {users.map((user) => (
            <form
              key={user.id}
              action={(formData) => updateUser(user.id, formData)}
              className={`grid ${userGridColumns} items-center gap-3 border-t border-line px-4 py-3`}
            >
              <input name="name" defaultValue={user.name} className="min-w-0 rounded-md border-line text-sm" required />
              <input name="email" type="email" defaultValue={user.email.endsWith("@pin.local") ? "" : user.email} className="min-w-0 rounded-md border-line text-sm" />
              <select name="role" defaultValue={user.role} className="min-w-0 rounded-md border-line text-sm">
                {userRoles.map((role) => (
                  <option key={role} value={role}>
                    {getRoleLabel(role as UserRole)}
                  </option>
                ))}
              </select>
              <label className="inline-flex min-w-0 items-center gap-2">
                {user.id === currentUserId ? <input type="hidden" name="isActive" value="on" /> : null}
                <input
                  name="isActive"
                  type="checkbox"
                  defaultChecked={user.isActive}
                  disabled={user.id === currentUserId}
                  className="rounded border-line"
                />
                <span className="text-xs text-muted">{user.id === currentUserId ? "вы" : ""}</span>
              </label>
              <input
                name="pin"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                minLength={6}
                placeholder="не менять"
                className="min-w-0 rounded-md border-line text-sm"
              />
              <button className="inline-flex min-w-0 items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-sm" disabled={isPending}>
                <Save className="h-4 w-4 shrink-0" />
                Сохранить
              </button>
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}

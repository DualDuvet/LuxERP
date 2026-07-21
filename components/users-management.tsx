"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Save } from "lucide-react";
import { getRoleLabel, userRoles } from "@/lib/roles";
import type { UserRole } from "@/lib/types";

type ManagedUser = {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  isActive: boolean;
};

const userGridColumns = "grid-cols-[1fr_1.15fr_0.9fr_0.6fr_1.35fr_0.55fr]";

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
        username: formData.get("username"),
        name: formData.get("name"),
        role: formData.get("role"),
        phrase: formData.get("phrase")
      })
    });

    await refreshAfter(response, "Не удалось создать пользователя");
  }

  async function updateUser(userId: string, formData: FormData) {
    const response = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: formData.get("username"),
        name: formData.get("name"),
        role: formData.get("role"),
        isActive: formData.get("isActive") === "on",
        phrase: formData.get("phrase")
      })
    });

    await refreshAfter(response, "Не удалось обновить пользователя");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Пользователи</h1>
        <p className="mt-1 text-sm text-muted">Управление логинами, ролями, активностью и контрольными фразами.</p>
      </div>

      {error ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <section className="rounded-md border border-line bg-white p-4 shadow-soft">
        <h2 className="font-semibold text-ink">Новый пользователь</h2>
        <form action={createUser} className="mt-4 grid gap-3 text-sm md:grid-cols-5">
          <label className="space-y-1">
            <span className="text-xs text-muted">Логин</span>
            <input name="username" className="w-full rounded-md border-line text-sm" pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,29}" required />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted">Имя</span>
            <input name="name" className="w-full rounded-md border-line text-sm" required />
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
            <span className="text-xs text-muted">Фраза — 3 слова</span>
            <input name="phrase" type="password" autoComplete="new-password" className="w-full rounded-md border-line text-sm" required />
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
        <div className="min-w-[1000px] text-sm">
          <div className={`grid ${userGridColumns} gap-3 bg-panel px-4 py-3 text-xs uppercase text-muted`}>
            <div className="font-medium">Логин</div>
            <div className="font-medium">Имя</div>
            <div className="font-medium">Роль</div>
            <div className="font-medium">Активен</div>
            <div className="font-medium">Новая фраза</div>
            <div />
          </div>

          {users.map((user) => (
            <form
              key={user.id}
              action={(formData) => updateUser(user.id, formData)}
              className={`grid ${userGridColumns} items-center gap-3 border-t border-line px-4 py-3`}
            >
              <input name="username" defaultValue={user.username} className="min-w-0 rounded-md border-line text-sm" pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,29}" required />
              <input name="name" defaultValue={user.name} className="min-w-0 rounded-md border-line text-sm" required />
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
              </label>
              <input name="phrase" type="password" autoComplete="new-password" placeholder="не менять" className="min-w-0 rounded-md border-line text-sm" />
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

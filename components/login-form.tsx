"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { isValidControlPhrase, normalizeControlPhrase } from "@/lib/auth-phrase";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [phrase, setPhrase] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedPhrase = normalizeControlPhrase(phrase);

    if (!isValidControlPhrase(normalizedPhrase)) {
      setError("Контрольная фраза должна состоять ровно из трёх слов.");
      return;
    }

    setIsPending(true);
    const result = await authClient.signIn.username({
      username: username.trim().toLowerCase(),
      password: normalizedPhrase
    });
    setIsPending(false);

    if (result.error) {
      setError("Неверный логин или контрольная фраза.");
      return;
    }

    router.replace(nextPath);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-line bg-white p-6 shadow-soft">
      <label className="block space-y-2">
        <span className="text-sm text-muted">Логин</span>
        <input
          name="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          autoFocus
          required
          className="w-full rounded-xl border border-line px-4 py-3 outline-none transition focus:border-accent"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm text-muted">Контрольная фраза — 3 слова</span>
        <input
          name="phrase"
          type="password"
          value={phrase}
          onChange={(event) => setPhrase(event.target.value)}
          autoComplete="current-password"
          required
          className="w-full rounded-xl border border-line px-4 py-3 outline-none transition focus:border-accent"
        />
      </label>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-medium text-white shadow-soft disabled:opacity-60"
      >
        {isPending ? "Проверка…" : "Войти"}
      </button>
    </form>
  );
}
